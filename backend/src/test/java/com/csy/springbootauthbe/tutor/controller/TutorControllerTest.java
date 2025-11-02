package com.csy.springbootauthbe.tutor.controller;

import com.csy.springbootauthbe.common.aws.AwsService;
import com.csy.springbootauthbe.tutor.dto.TutorDTO;
import com.csy.springbootauthbe.tutor.service.TutorService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;

import com.csy.springbootauthbe.tutor.utils.TutorResponse;
import com.csy.springbootauthbe.tutor.entity.Review;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@WebMvcTest(
        controllers = TutorController.class,
        excludeAutoConfiguration = {
                org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class,
                org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration.class
        }
)
@AutoConfigureMockMvc(addFilters = false)
class TutorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TutorService tutorService;

    @MockBean
    private AwsService awsService;

    @MockBean
    private com.csy.springbootauthbe.config.JWTAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private com.csy.springbootauthbe.config.JWTService jwtService;

    @MockBean
    private com.csy.springbootauthbe.common.wrapper.UserDetailsServiceWrapper userDetailsServiceWrapper;

    @Test
    void getTutorByUserId_ok_returns200() throws Exception {
        var dto = new TutorDTO();
        dto.setUserId("U1");

        when(tutorService.getTutorByUserId("U1")).thenReturn(Optional.of(dto));

        mockMvc.perform(get("/api/v1/tutors/{userId}", "U1"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/json"));
    }

    @Test
    void getTutorByUserId_notFound_returns404() throws Exception {
        when(tutorService.getTutorByUserId("U404")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/tutors/{userId}", "U404"))
                .andExpect(status().isNotFound());
    }

    // ----------------------------------------------------------------------
    // PUT /{userId} - updateTutor
    // ----------------------------------------------------------------------
    @Test
    void updateTutor_success_returns200() throws Exception {
        TutorResponse mockResponse = new TutorResponse(); // no setMessage
        when(tutorService.updateTutor(anyString(), any())).thenReturn(mockResponse);

        String lessonTypeJson = "[\"Math\",\"Science\"]";
        String availabilityJson = "{\"Mon\":{\"enabled\":true}}";
        String qualificationsJson = "[{\"name\":\"Cert1\",\"type\":\"pdf\"}]";

        mockMvc.perform(multipart("/api/v1/tutors/{userId}", "T1")
                        .param("hourlyRate", "50")
                        .param("description", "Experienced tutor")
                        .param("lessonType", lessonTypeJson)
                        .param("subject", "Math")
                        .param("availability", availabilityJson)
                        .param("qualifications", qualificationsJson)
                        .with(request -> {
                            request.setMethod("PUT"); // important: force PUT for multipart
                            return request;
                        }))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/json"))
                // just ensure valid JSON and call happened
                .andExpect(jsonPath("$").exists());

        verify(tutorService).updateTutor(eq("T1"), any());
    }


    // ----------------------------------------------------------------------
    // DELETE /{userId}
    // ----------------------------------------------------------------------
    @Test
    void deleteTutor_success_returns200() throws Exception {
        mockMvc.perform(delete("/api/v1/tutors/{userId}", "T123"))
                .andExpect(status().isOk())
                .andExpect(content().string("Tutor info deleted successfully."));
    }

    // ----------------------------------------------------------------------
    // POST /{id}/profile-picture
    // ----------------------------------------------------------------------
    @Test
    void uploadProfilePicture_success_returns200() throws Exception {
        var dto = new TutorDTO();
        dto.setUserId("T1");
        dto.setProfileImageUrl("https://bucket.s3.amazonaws.com/pic.jpg");

        when(tutorService.updateProfilePicture(any(), any())).thenReturn(dto);

        MockMultipartFile file = new MockMultipartFile(
                "file", "pic.jpg", "image/jpeg", "test".getBytes());

        mockMvc.perform(multipart("/api/v1/tutors/{id}/profile-picture", "T1")
                        .file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profileImageUrl").value("https://bucket.s3.amazonaws.com/pic.jpg"));
    }

    // ----------------------------------------------------------------------
    // POST /{tutorId}/review
    // ----------------------------------------------------------------------
    @Test
    void addReview_success_returns200() throws Exception {
        var dto = new TutorDTO();
        dto.setUserId("T1");
        dto.setSubject("Math");
        when(tutorService.addReview(anyString(), anyString(), anyString(), anyInt(), anyString()))
                .thenReturn(dto);

        String body = """
                {
                  "bookingId": "B001",
                  "studentName": "Alice",
                  "rating": 5,
                  "comment": "Excellent!"
                }
                """;

        mockMvc.perform(post("/api/v1/tutors/{tutorId}/review", "T1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value("T1"));
    }

    // ----------------------------------------------------------------------
    // GET /{userId}/reviews
    // ----------------------------------------------------------------------
    @Test
    void getTutorReviews_success_returns200() throws Exception {
        Review review = new Review();
        review.setStudentName("Bob");
        review.setComment("Good lesson");

        when(tutorService.getTutorReviewsByUserId("T1")).thenReturn(List.of(review));

        mockMvc.perform(get("/api/v1/tutors/{userId}/reviews", "T1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].studentName").value("Bob"))
                .andExpect(jsonPath("$[0].comment").value("Good lesson"));
    }
}
