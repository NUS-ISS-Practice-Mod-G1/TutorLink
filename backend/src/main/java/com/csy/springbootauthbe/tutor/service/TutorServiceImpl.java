package com.csy.springbootauthbe.tutor.service;

import com.csy.springbootauthbe.common.aws.AwsResponse;
import com.csy.springbootauthbe.common.aws.AwsService;
import com.csy.springbootauthbe.common.utils.SanitizedLogger;
import com.csy.springbootauthbe.tutor.dto.TutorDTO;
import com.csy.springbootauthbe.tutor.dto.TutorStagedProfileDTO;
import com.csy.springbootauthbe.tutor.entity.QualificationFile;
import com.csy.springbootauthbe.tutor.entity.Review;
import com.csy.springbootauthbe.tutor.entity.Tutor;
import com.csy.springbootauthbe.tutor.mapper.TutorMapper;
import com.csy.springbootauthbe.tutor.repository.TutorRepository;
import com.csy.springbootauthbe.tutor.utils.TutorRequest;
import com.csy.springbootauthbe.tutor.utils.TutorResponse;
import com.csy.springbootauthbe.user.entity.AccountStatus;
import com.csy.springbootauthbe.user.entity.User;
import com.csy.springbootauthbe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.*;


@Service
@RequiredArgsConstructor
public class TutorServiceImpl implements TutorService {

    private final TutorRepository tutorRepository;
    private final UserRepository userRepository;
    private final TutorMapper tutorMapper;
    private final AwsService awsService;
    private static final SanitizedLogger logger = SanitizedLogger.getLogger(TutorServiceImpl.class);
    
    private static final String DEFAULT_PROFILE_URL =
            "https://tutorlink-s3.s3.us-east-1.amazonaws.com/profilePicture/default-profile-pic.jpg";

    @Override
    public TutorDTO createTutor(TutorDTO tutorDTO) {
        Tutor tutor = tutorMapper.toEntity(tutorDTO);
        Tutor saved = tutorRepository.save(tutor);
        return tutorMapper.toDTO(saved);
    }

    @Override
    public Optional<TutorDTO> getTutorByUserId(String userId) {
        logger.info("Getting tutor a profile: {}", userId);
        User user = userRepository.findById(userId).orElse(null);
        Optional<TutorDTO> tutor = tutorRepository.findByUserId(userId).map(tutorMapper::toDTO);
        tutor.map(t -> {
            t.setStatus(user != null ? user.getStatus().toString() : null);
            return t;
        });
        return tutor;
    }

    @Override
    public TutorResponse updateTutor(String userId, TutorRequest updatedData)
        throws NoSuchAlgorithmException, IOException {
        logger.info("Updating tutor profile: {}", updatedData.toString());

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        Tutor tutor = tutorRepository.findByUserId(userId)
            .orElseThrow(() -> new UsernameNotFoundException("Tutor not found"));

        // If previous staged profile was rejected, delete old staged files from AWS
        if (tutor.getStagedProfile() != null && tutor.getRejectedReason() != null) {
            List<QualificationFile> oldStagedFiles = tutor.getStagedProfile().getQualifications();
            if (oldStagedFiles != null) {
                for (QualificationFile file : oldStagedFiles) {
                    if (file.getPath() != null) {
                        awsService.deleteFile(file.getPath());
                        logger.info("Deleted rejected staged qualification from S3: {}", file.getPath());
                    }
                }
            }
            // Clear previous staged profile
            tutor.setStagedProfile(new TutorStagedProfileDTO());
        }

        TutorStagedProfileDTO stagedTutor = new TutorStagedProfileDTO();

        stagedTutor.setSubject(updatedData.getSubject());
        stagedTutor.setDescription(updatedData.getDescription());
        stagedTutor.setLessonType(
            updatedData.getLessonType() != null
                ? new ArrayList<>(updatedData.getLessonType())
                : new ArrayList<>()
        );
        stagedTutor.setHourlyRate(updatedData.getHourlyRate());
        stagedTutor.setAvailability(
            updatedData.getAvailability() != null
                ? new HashMap<>(updatedData.getAvailability())
                : new HashMap<>()
        );
        stagedTutor.setProfileImageUrl(tutor.getProfileImageUrl());

        List<QualificationFile> activeQualifications = Optional.ofNullable(tutor.getQualifications())
            .orElseGet(ArrayList::new);

        List<QualificationFile> stagedQualifications = new ArrayList<>();
        for (QualificationFile q : activeQualifications) {
            QualificationFile copy = new QualificationFile();
            copy.setName(q.getName());
            copy.setType(q.getType());
            copy.setHash(q.getHash());
            copy.setPath(q.getPath());
            copy.setDeleted(q.isDeleted());
            copy.setUploadedAt(q.getUploadedAt());
            copy.setUpdatedAt(q.getUpdatedAt());
            stagedQualifications.add(copy);
        }

        Set<String> newHashes = new HashSet<>();

        if (updatedData.getFileUploads() != null) {
            for (MultipartFile file : updatedData.getFileUploads()) {
                String hash = hash(file);
                newHashes.add(hash);

                boolean exists = stagedQualifications.stream()
                    .anyMatch(f -> f.getHash().equals(hash));
                if (!exists) {
                    QualificationFile qFile = new QualificationFile();
                    qFile.setName(file.getOriginalFilename());
                    qFile.setType(file.getContentType());
                    qFile.setUploadedAt(new Date());
                    qFile.setHash(hash);

                    AwsResponse awsRes = awsService.uploadFile(file, userId);
                    qFile.setPath(awsRes.getKey());
                    qFile.setDeleted(false);

                    stagedQualifications.add(qFile);
                }
            }
        }

        if (updatedData.getQualifications() != null) {
            for (QualificationFile metaFile : updatedData.getQualifications()) {
                newHashes.add(metaFile.getHash());
            }
        }

        for (QualificationFile oldFile : stagedQualifications) {
            oldFile.setDeleted(!newHashes.contains(oldFile.getHash()));
            if (!oldFile.isDeleted() && oldFile.getUpdatedAt() != null) {
                oldFile.setUpdatedAt(null);
            } else if (oldFile.isDeleted() && oldFile.getUpdatedAt() == null) {
                oldFile.setUpdatedAt(new Date());
            }
        }

        stagedTutor.setQualifications(stagedQualifications);
        tutor.setStagedProfile(stagedTutor);
        tutor.setPreviousStatus(user.getStatus());

        user.setStatus(AccountStatus.PENDING_APPROVAL);
        tutor.setRejectedReason(null);

        userRepository.save(user);
        tutorRepository.save(tutor);

        return createTutorResponse(tutor, user);
    }


    @Override
    public TutorDTO updateProfilePicture(String tutorId, MultipartFile file) {
        logger.info("Updating profile picture for studentId: {}", tutorId);

        Tutor tutor = tutorRepository.findByUserId(tutorId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        // Delete old profile picture if it's not default
        if (tutor.getProfileImageUrl() != null &&
                !tutor.getProfileImageUrl().equals(DEFAULT_PROFILE_URL)) {
            String oldKey = awsService.extractKeyFromUrl(tutor.getProfileImageUrl());
            if (oldKey != null) {
                awsService.deleteProfilePic(oldKey);
                logger.info("Deleted old profile picture from S3: {}", oldKey);
            }
        }

        // Upload new file and get hash + key
        AwsResponse uploadRes = awsService.uploadProfilePic(file, "profilePicture");
        String newKey = uploadRes.getKey();
        String newHash = uploadRes.getHash();

        // Construct public URL
        String fileUrl = "https://" + awsService.bucketName + ".s3.amazonaws.com/" + newKey;
        logger.info("Uploaded new profile picture: {}, hash: {}", fileUrl, newHash);

        tutor.setProfileImageUrl(fileUrl);

        Tutor saved = tutorRepository.save(tutor);
        return tutorMapper.toDTO(saved);
    }

    private String hash(MultipartFile file) throws NoSuchAlgorithmException, IOException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(file.getBytes());
        return Base64.getEncoder().encodeToString(hash);
    }

    @Override
    public void deleteTutor(String userId) {
            Tutor tutor = tutorRepository.findByUserId(userId)
                    .orElseThrow(() -> new UsernameNotFoundException("Tutor not found"));
        tutorRepository.delete(tutor);
    }

    @Override
    public TutorDTO addReview(String tutorId, String bookingId, String studentName, int rating, String comment) {
        Tutor tutor = tutorRepository.findByUserId(tutorId)
                .orElseThrow(() -> new RuntimeException("Tutor not found"));

        // Initialize reviews if null
        if (tutor.getReviews() == null) {
            tutor.setReviews(new ArrayList<>());
        }

        // Prevent duplicate review per session
        boolean alreadyReviewed = tutor.getReviews().stream()
                .anyMatch(r -> r.getBookingId() != null && r.getBookingId().equals(bookingId));

        if (alreadyReviewed) {
            throw new RuntimeException("You have already reviewed this session.");
        }

        // Build new review
        Review review = Review.builder()
                .bookingId(bookingId)
                .studentName(studentName)
                .rating(rating)
                .comment(comment)
                .createdAt(LocalDateTime.now())
                .build();

        tutor.addReview(review);

        Tutor saved = tutorRepository.save(tutor);
        return tutorMapper.toDTO(saved);
    }

    @Override
    public List<Review> getTutorReviewsByUserId(String userId) {
        Tutor tutor = tutorRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Tutor not found"));

        if (tutor.getReviews() == null || tutor.getReviews().isEmpty()) {
            return Collections.emptyList();
        }

        // Sort newest first
        List<Review> reviews = new ArrayList<>(tutor.getReviews());
        reviews.sort(Comparator.comparing(
                com.csy.springbootauthbe.tutor.entity.Review::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
        );

        return reviews;
    }


    private TutorResponse createTutorResponse(Tutor tutor, User user) {
        return TutorResponse.builder()
                .id(tutor.getId())
                .hourlyRate(tutor.getHourlyRate())
                .qualifications(tutor.getQualifications())
                .availability(tutor.getAvailability())
                .status(user.getStatus().toString())
                .build();
    }


}