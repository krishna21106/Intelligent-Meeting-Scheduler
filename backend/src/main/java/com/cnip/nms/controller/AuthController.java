package com.cnip.nms.controller;

import com.cnip.nms.dto.AuthRequest;
import com.cnip.nms.dto.AuthResponse;
import com.cnip.nms.dto.CustomerRegistrationRequest;
import com.cnip.nms.dto.UserDto;
import com.cnip.nms.security.SecurityUtils;
import com.cnip.nms.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Endpoints for user login and current profile")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Authenticate user and receive JWT token")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    @Operation(summary = "Register customer / student station account")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody CustomerRegistrationRequest request) {
        return ResponseEntity.ok(authService.registerCustomer(request));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user profile")
    public ResponseEntity<UserDto> getCurrentUser() {
        String username = SecurityUtils.getCurrentUsername();
        return ResponseEntity.ok(authService.getCurrentUser(username));
    }
}

