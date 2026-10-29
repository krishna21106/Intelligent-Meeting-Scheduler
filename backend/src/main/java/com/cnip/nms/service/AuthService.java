package com.cnip.nms.service;

import com.cnip.nms.dto.AuthRequest;
import com.cnip.nms.dto.AuthResponse;
import com.cnip.nms.dto.CustomerRegistrationRequest;
import com.cnip.nms.dto.CustomerSummaryDto;
import com.cnip.nms.dto.UserDto;
import com.cnip.nms.entity.User;
import com.cnip.nms.exception.BadRequestException;
import com.cnip.nms.repository.UserRepository;
import com.cnip.nms.security.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.nio.charset.StandardCharsets;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final AuditLogService auditLogService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(AuthenticationManager authenticationManager, UserRepository userRepository,
                       JwtUtil jwtUtil, AuditLogService auditLogService, PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.auditLogService = auditLogService;
        this.passwordEncoder = passwordEncoder;
    }

    public AuthResponse login(AuthRequest request) {
        String username = request.getUsername().trim();
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, request.getPassword())
            );
        } catch (AuthenticationException exception) {
            auditLogService.logAction(username, "LOGIN_FAILED", "USER", username, "Authentication failed");
            throw exception;
        }

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found: " + username));

        String token = jwtUtil.generateToken(userDetails, user.getRoleName());

        auditLogService.logAction(user.getUsername(), "LOGIN", "USER", user.getUsername(), "User logged in successfully");

        return createResponse(user, token);
    }

    public AuthResponse registerCustomer(CustomerRegistrationRequest request) {
        String username = request.getUsername().trim();
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (request.getPassword().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new BadRequestException("Password must not exceed 72 UTF-8 bytes");
        }
        if (userRepository.existsByUsername(username)) {
            throw new BadRequestException("That username is already registered");
        }
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("That email address is already registered");
        }

        User user = userRepository.save(User.builder()
                .username(username)
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .roleName("CUSTOMER")
                .build());
        UserDetails userDetails = org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPasswordHash())
                .authorities("ROLE_CUSTOMER")
                .build();
        String token = jwtUtil.generateToken(userDetails, user.getRoleName());
        auditLogService.logAction(username, "REGISTER_CUSTOMER", "USER", username, "Customer account created");
        auditLogService.logAction(username, "LOGIN", "USER", username, "Customer logged in after registration");
        return createResponse(user, token);
    }

    public UserDto getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found: " + username));

        return toUserDto(user);
    }

    public List<CustomerSummaryDto> getCustomers() {
        return userRepository.findByRoleNameOrderByUsernameAsc("CUSTOMER").stream()
                .map(user -> new CustomerSummaryDto(user.getId(), user.getUsername(), user.getEmail()))
                .toList();
    }

    private AuthResponse createResponse(User user, String token) {
        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtUtil.getExpirationMs() / 1000)
                .user(toUserDto(user))
                .build();
    }

    private UserDto toUserDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRoleName())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
