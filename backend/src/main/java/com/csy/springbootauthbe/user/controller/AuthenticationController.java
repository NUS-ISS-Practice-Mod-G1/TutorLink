package com.csy.springbootauthbe.user.controller;

import com.csy.springbootauthbe.user.service.AuthenticationService;
import com.csy.springbootauthbe.user.utils.AuthenticationResponse;
import com.csy.springbootauthbe.user.utils.LoginRequest;
import com.csy.springbootauthbe.user.utils.RegisterRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthenticationController {

    private final AuthenticationService service;
    private static final Logger logger = LoggerFactory.getLogger(AuthenticationController.class);

    /**
     * Sanitizes user input for logging by removing CR/LF/control characters.
     * @param input User-supplied string to sanitize.
     * @return Sanitized string safe for single-line logging.
     */
    private static String sanitizeForLog(String input) {
        if (input == null) return null;
        // Remove CR, LF, tabs, and any non-printable/control characters
        return input.replaceAll("[\\r\\n\\t\\f\\u000B\\u0000-\\u001F\\u007F]+", " ");
    }

    @PostMapping("/register")
    public ResponseEntity<AuthenticationResponse> register(@RequestBody RegisterRequest request) {
        logger.info("Register request received for email: {}", sanitizeForLog(request.getEmail()));
        try {
            AuthenticationResponse response = service.register(request);
            logger.info("Register successful for email: {}", sanitizeForLog(request.getEmail()));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Register failed for email: {}. Error: {}", sanitizeForLog(request.getEmail()), e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> login(@RequestBody LoginRequest request) {
        logger.info("Login request received for email: {}", sanitizeForLog(request.getEmail()));
        try {
            AuthenticationResponse response = service.login(request);
            logger.info("Login successful for email: {}", sanitizeForLog(request.getEmail()));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Login failed for email: {}. Error: {}", sanitizeForLog(request.getEmail()), e.getMessage(), e);
            throw e;
        }
    }
}
