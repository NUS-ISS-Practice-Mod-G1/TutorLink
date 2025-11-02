package com.csy.springbootauthbe.common.aws;

import com.csy.springbootauthbe.common.utils.SanitizedLogger;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.ChecksumAlgorithm;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.net.URL;
import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AwsService {
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private static final SanitizedLogger logger = SanitizedLogger.getLogger(AwsService.class);
    @Value("${aws.s3.bucket}")
    public String bucketName;

    public AwsResponse uploadFile(MultipartFile file, String folder) {
        String key = folder + "/" + file.getOriginalFilename();
        AwsResponse res = new AwsResponse();
        try {
            PutObjectResponse response =s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(key)
                            .contentType(file.getContentType())
                            .contentLength(file.getSize())
                            .checksumAlgorithm(ChecksumAlgorithm.SHA256)
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize())
            );

            res.setHash(response.checksumSHA256());
            res.setKey(key);
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file", e);
        }

        return res; // or s3Client.utilities().getUrl(...) to get full URL
    }

    public AwsResponse uploadProfilePic(MultipartFile file, String folder) {
        // Generate unique key
        String key = folder + "/" + UUID.randomUUID() + "_" + file.getOriginalFilename();
        AwsResponse res = new AwsResponse();

        try {
            PutObjectResponse response = s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(key)
                            .contentType(file.getContentType())
                            .contentLength(file.getSize())
                            .checksumAlgorithm(ChecksumAlgorithm.SHA256)
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize())
            );

            // Populate response
            res.setKey(key);
            res.setHash(response.checksumSHA256());

        } catch (IOException e) {
            throw new RuntimeException("Failed to upload profile pic", e);
        }

        return res;
    }

    public void deleteFile(String key) {
        if (key == null || key.isEmpty()) return;

        try {
            s3Client.deleteObject(b -> b.bucket(bucketName).key(key));
            logger.info("Deleted S3 file: {}", key);
        } catch (Exception e) {
            logger.error("Failed to delete S3 file: {}", key, e);
            throw new RuntimeException("Failed to delete S3 file: " + key, e);
        }
    }

    public void deleteProfilePic(String key) {
        try {
            s3Client.deleteObject(b -> b.bucket(bucketName).key(key));
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete profile pic from S3: " + key, e);
        }
    }

    public String extractKeyFromUrl(String url) {
        if (url == null) return null;
        // Example URL: https://bucket-name.s3.us-east-1.amazonaws.com/profilePicture/abc.jpg
        int idx = url.indexOf(".amazonaws.com/");
        if (idx == -1) return null;
        return url.substring(idx + ".amazonaws.com/".length());
    }

    /**
     * Generate a presigned URL for viewing a private file (valid for 10 minutes)
     */
    public String generatePresignedUrl(String key) {
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(10))
                .getObjectRequest(getObjectRequest)
                .build();

            URL presignedUrl = s3Presigner.presignGetObject(presignRequest).url();
            logger.info("Generated presigned URL for key: {}", key);
            return presignedUrl.toString();
        } catch (Exception e) {
            logger.error("Failed to generate presigned URL for key: {}", key, e);
            throw new RuntimeException("Failed to generate presigned URL for key: " + key, e);
        }
    }






}
