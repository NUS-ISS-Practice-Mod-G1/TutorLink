package com.csy.springbootauthbe.notification.controller;

import com.csy.springbootauthbe.notification.service.NotificationService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/sse/notifications")
public class NotificationSseController {

    private final NotificationService notificationService;

    public NotificationSseController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping(value = "/stream/{userId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamNotifications(@PathVariable String userId) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE); // no timeout
        notificationService.registerEmitter(userId, emitter);
        return emitter;
    }
}

