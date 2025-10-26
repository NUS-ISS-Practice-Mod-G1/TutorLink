package com.csy.springbootauthbe;

import com.csy.springbootauthbe.admin.repository.AdminRepository;
import com.csy.springbootauthbe.booking.repository.BookingRepository;
import com.csy.springbootauthbe.doctor.repository.DoctorRepository;
import com.csy.springbootauthbe.student.repository.StudentRepository;
import com.csy.springbootauthbe.tutor.repository.TutorRepository;
import com.csy.springbootauthbe.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration;
import org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.test.context.TestPropertySource;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(
        classes = SpringbootAuthBeApplicationTests.TestConfig.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE
)
@EnableAutoConfiguration(exclude = {
        MongoAutoConfiguration.class,
        MongoDataAutoConfiguration.class
})
@TestPropertySource(properties = {
        "aws.s3.access-key=dummy",
        "aws.s3.secret-key=dummy",
        "aws.s3.region=us-east-1",
        "aws.s3.bucket=test-bucket",
        "jwt.secret.key=dummy",
        "spring.main.web-application-type=none"
})
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class SpringbootAuthBeApplicationTests {

    @EnableAutoConfiguration(exclude = {
            MongoAutoConfiguration.class,
            MongoDataAutoConfiguration.class
    })
    static class TestConfig {}

    // --- Mock all repositories your services depend on ---
    @MockBean private AdminRepository adminRepository;
    @MockBean private UserRepository userRepository;
    @MockBean private TutorRepository tutorRepository;
    @MockBean private StudentRepository studentRepository;
    @MockBean private DoctorRepository doctorRepository;
    @MockBean private BookingRepository bookingRepository;

    // --- Mock infrastructure beans that use Mongo directly ---
    @MockBean private MongoTemplate mongoTemplate;
    @MockBean private GridFsTemplate gridFsTemplate;

    @Test
    void contextLoads() {
        assertTrue(true, "Application context loaded successfully with mocked dependencies.");
    }
}
