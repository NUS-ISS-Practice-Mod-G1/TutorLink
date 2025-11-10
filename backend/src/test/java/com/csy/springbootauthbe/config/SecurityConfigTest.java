package com.csy.springbootauthbe.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.DefaultSecurityFilterChain;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SecurityConfigTest {

    private JWTAuthenticationFilter jwtFilter;
    private AuthenticationProvider authProvider;
    private SecurityConfig config;

    @BeforeEach
    void setUp() {
        jwtFilter = mock(JWTAuthenticationFilter.class);
        authProvider = mock(AuthenticationProvider.class);
        config = new SecurityConfig(jwtFilter, authProvider);
    }

    @Test
    void testSecurityFilterChain_BuildsSuccessfully() throws Exception {
        HttpSecurity http = mock(HttpSecurity.class, RETURNS_DEEP_STUBS);
        DefaultSecurityFilterChain mockChain = mock(DefaultSecurityFilterChain.class);

        // --- Stub chained calls safely ---
        when(http.cors(any(Customizer.class))).thenReturn(http);
        when(http.csrf(any(Customizer.class))).thenReturn(http);
        when(http.authorizeHttpRequests(any(Customizer.class))).thenReturn(http);
        when(http.sessionManagement(any(Customizer.class))).thenReturn(http);
        when(http.authenticationProvider(any())).thenReturn(http);
        when(http.addFilterBefore(any(), any())).thenReturn(http);
        when(http.build()).thenReturn(mockChain);

        // --- Execute ---
        SecurityFilterChain result = config.securityFilterChain(http);

        // --- Verify ---
        assertNotNull(result);
        verify(http).cors(any(Customizer.class));
        verify(http).csrf(any(Customizer.class));
        verify(http).authenticationProvider(authProvider);
        verify(http).addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        verify(http).build();
    }
}
