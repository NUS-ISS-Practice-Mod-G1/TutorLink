package com.csy.springbootauthbe.student.service;

import com.csy.springbootauthbe.common.aws.AwsResponse;
import com.csy.springbootauthbe.common.aws.AwsService;
import com.csy.springbootauthbe.common.sequence.SequenceGeneratorService;
import com.csy.springbootauthbe.common.utils.SanitizedLogger;
import com.csy.springbootauthbe.student.dto.StudentDTO;
import com.csy.springbootauthbe.student.dto.TutorProfileDTO;
import com.csy.springbootauthbe.student.entity.Student;
import com.csy.springbootauthbe.student.mapper.StudentMapper;
import com.csy.springbootauthbe.student.repository.StudentRepository;
import com.csy.springbootauthbe.student.utils.TutorSearchRequest;
import com.csy.springbootauthbe.tutor.entity.QualificationFile;
import com.csy.springbootauthbe.tutor.entity.Review;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;
import org.bson.types.ObjectId;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Service
@RequiredArgsConstructor
public class StudentServiceImpl implements StudentService {

    private final StudentRepository studentRepository;
    private final StudentMapper studentMapper;
    private final MongoTemplate mongoTemplate;
    private final SequenceGeneratorService sequenceGenerator;
    private final AwsService awsService;
    private static final SanitizedLogger logger = SanitizedLogger.getLogger(StudentServiceImpl.class);

    private static final String DEFAULT_PROFILE_URL =
            "https://tutorlink-s3.s3.us-east-1.amazonaws.com/profilePicture/default-profile-pic.jpg";

    @Override
    public StudentDTO createStudent(StudentDTO studentDTO) {
        logger.info("Creating student with data: {}", studentDTO);

        // generate next student number here
        String studentNumber = sequenceGenerator.getNextStudentId();
        studentDTO.setStudentNumber(studentNumber);

        // Set default profile pic
        studentDTO.setProfileImageUrl(DEFAULT_PROFILE_URL);

        Student student = studentMapper.toEntity(studentDTO);
        Student saved = studentRepository.save(student);
        logger.info("Student saved with ID: {}", saved.getId());
        return studentMapper.toDTO(saved);
    }

    @Override
    public Optional<StudentDTO> getStudentByUserId(String userId) {
        logger.info("Fetching student by userId: {}", userId);
        Optional<Student> studentOpt = studentRepository.findByUserId(userId);
        studentOpt.ifPresent(student -> logger.info("Found student entity: {}", student));
        return studentOpt.map(studentMapper::toDTO);
    }

    @Override
    public List<TutorProfileDTO> searchTutors(TutorSearchRequest req) {
        logger.info("Searching tutors with request: {}", req);

        List<AggregationOperation> ops = new ArrayList<>();

        ops.add(Aggregation.addFields()
                .addFieldWithValue("userIdObj", new Document("$toObjectId", "$userId"))
                .build());

        ops.add(Aggregation.lookup("users", "userIdObj", "_id", "user"));
        ops.add(Aggregation.unwind("user", true));

        ops.add(Aggregation.addFields()
                .addFieldWithValue("firstname", "$user.firstname")
                .addFieldWithValue("lastname", "$user.lastname")
                .addFieldWithValue("email", "$user.email")
                .build());

        // Apply filters (same as before) ...
        List<Criteria> criteriaList = new ArrayList<>();
        if (req.getName() != null) {
            criteriaList.add(new Criteria().orOperator(
                    Criteria.where("firstname").regex(req.getName(), "i"),
                    Criteria.where("lastname").regex(req.getName(), "i")
            ));
        }
        if (req.getSubject() != null) {
            criteriaList.add(Criteria.where("subject").regex(req.getSubject(), "i"));
        }
        if (req.getMinPrice() != null && req.getMaxPrice() != null) {
            criteriaList.add(Criteria.where("hourlyRate")
                    .gte(req.getMinPrice())
                    .lte(req.getMaxPrice()));
        }
        if (req.getAvailability() != null) {
            String dbKey = normalizeDay(req.getAvailability());
            if (dbKey != null) {
                criteriaList.add(Criteria.where("availability." + dbKey + ".enabled").is(true));
            }
        }

        if (!criteriaList.isEmpty()) {
            ops.add(Aggregation.match(new Criteria().andOperator(criteriaList.toArray(new Criteria[0]))));
        }

        ops.add(Aggregation.project("subject", "hourlyRate", "availability", "firstname", "lastname", "email", "profileImageUrl", "description", "lessonType", "qualifications","reviews" ));

        Aggregation aggregation = Aggregation.newAggregation(ops);
        List<Document> docs = mongoTemplate.aggregate(aggregation, "tutors", Document.class).getMappedResults();

        // Map to TutorDTO
        List<TutorProfileDTO> tutors = new ArrayList<>();
        for (Document doc : docs) {
            tutors.add(mapToTutorDTO(doc));
        }
        return tutors;
    }

    @Override
    public Optional<TutorProfileDTO> getTutorById(String tutorId) {
        logger.info("Fetching tutor details by ID: {}", tutorId);

        List<AggregationOperation> ops = new ArrayList<>();
        ops.add(Aggregation.addFields()
                .addFieldWithValue("userIdObj", new Document("$toObjectId", "$userId"))
                .build());

        ops.add(Aggregation.lookup("users", "userIdObj", "_id", "user"));
        ops.add(Aggregation.unwind("user", true));

        ops.add(Aggregation.addFields()
                .addFieldWithValue("firstname", "$user.firstname")
                .addFieldWithValue("lastname", "$user.lastname")
                .addFieldWithValue("email", "$user.email")
                .addFieldWithValue("userId", new Document("$toString", "$user._id"))
                .build());

        ops.add(Aggregation.match(Criteria.where("_id").is(new ObjectId(tutorId))));


        ops.add(Aggregation.project("subject", "hourlyRate", "availability", "userId", "firstname", "lastname", "email", "profileImageUrl", "description", "lessonType", "qualifications", "reviews"));

        Aggregation aggregation = Aggregation.newAggregation(ops);
        List<Document> docs = mongoTemplate.aggregate(aggregation, "tutors", Document.class).getMappedResults();

        // --- Log the raw MongoDB documents ---
        if (docs.isEmpty()) {
            logger.warn("No tutor found with ID: {}", tutorId);
            return Optional.empty();
        }

        // Log the entire document to see what fields are present
        Document doc = docs.get(0);
        logger.info("Raw tutor document from DB: {}", doc.toJson());

        // Additionally log specific fields
        logger.info("Subject: {}", doc.get("subject"));
        logger.info("Description: {}", doc.get("description"));
        logger.info("ProfileImageUrl: {}", doc.get("profileImageUrl"));

        return Optional.of(mapToTutorDTO(doc));
    }


    @Override
    public StudentDTO updateProfilePicture(String studentId, MultipartFile file) {
        logger.info("Updating profile picture for studentId: {}", studentId);

        Student student = studentRepository.findByUserId(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        // Delete old profile picture if it's not default
        if (student.getProfileImageUrl() != null &&
                !student.getProfileImageUrl().equals(DEFAULT_PROFILE_URL)) {
            String oldKey = awsService.extractKeyFromUrl(student.getProfileImageUrl());
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

        student.setProfileImageUrl(fileUrl);

        Student saved = studentRepository.save(student);
        return studentMapper.toDTO(saved);
    }



    /* ======= Helper Methods  ====================================================== */
    /* ======= Helper Methods  ====================================================== */
    private TutorProfileDTO mapToTutorDTO(Document doc) {
        TutorProfileDTO dto = new TutorProfileDTO();
        dto.setId(doc.getObjectId("_id").toHexString());
        dto.setUserId(doc.getString("userId"));
        dto.setFirstName(doc.getString("firstname"));
        dto.setLastName(doc.getString("lastname"));
        dto.setSubject(doc.getString("subject"));
        dto.setHourlyRate(doc.getDouble("hourlyRate"));
        dto.setAvailability((Map<String, Object>) doc.get("availability"));
        dto.setDescription(doc.getString("description"));
        dto.setProfileImageUrl(doc.getString("profileImageUrl"));
        dto.setLessonType((List<String>) doc.get("lessonType"));

        //  Handle reviews
        List<Document> reviewDocs = (List<Document>) doc.get("reviews");
        if (reviewDocs != null) {
            List<Review> reviews = new ArrayList<>();
            for (Document rDoc : reviewDocs) {
                Review review = new Review();
                review.setStudentName(rDoc.getString("studentName"));
                review.setRating(rDoc.getInteger("rating", 0)); // default 0 if null
                review.setComment(rDoc.getString("comment"));
                reviews.add(review);
            }
            dto.setReviews(reviews);
        }

        //  Handle qualifications
        List<Document> qDocs = (List<Document>) doc.get("qualifications");
        if (qDocs != null) {
            List<QualificationFile> files = new ArrayList<>();
            for (Document qDoc : qDocs) {
                QualificationFile qf = new QualificationFile();
                qf.setName(qDoc.getString("name"));
                qf.setType(qDoc.getString("type"));
                qf.setPath(qDoc.getString("path"));
                qf.setUploadedAt(qDoc.getDate("uploadedAt"));
                qf.setUpdatedAt(qDoc.getDate("updatedAt"));
                qf.setHash(qDoc.getString("hash"));
                qf.setDeleted(Boolean.TRUE.equals(qDoc.getBoolean("isDeleted")));
                files.add(qf);
            }
            dto.setQualifications(files);
        }

        return dto;
    }




    private static final Map<String, String> DAY_MAP = Map.ofEntries(
            Map.entry("MONDAY", "Mon"),
            Map.entry("TUESDAY", "Tue"),
            Map.entry("WEDNESDAY", "Wed"),
            Map.entry("THURSDAY", "Thu"),
            Map.entry("FRIDAY", "Fri"),
            Map.entry("SATURDAY", "Sat"),
            Map.entry("SUNDAY", "Sun")
    );

    private String normalizeDay(String input) {
        if (input == null) return null;
        return DAY_MAP.get(input.trim().toUpperCase()); // returns e.g. "Mon"
    }
}
