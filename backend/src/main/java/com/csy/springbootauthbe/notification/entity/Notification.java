package com.csy.springbootauthbe.notification.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "notifications")
public class Notification {
    @Id
    private String id;
    private String userId;
    private String type; // booking_accepted, booking_cancelled
    private String bookingId;
    private String message;
    private boolean read = false;
    private LocalDateTime createdAt = LocalDateTime.now();

}

