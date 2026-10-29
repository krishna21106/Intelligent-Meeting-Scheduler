package com.cnip.nms.service;

import com.cnip.nms.dto.AuthRequest;
import com.cnip.nms.dto.AuthResponse;
import com.cnip.nms.dto.CustomerRegistrationRequest;
import com.cnip.nms.dto.UserDto;
import com.cnip.nms.entity.User;
import com.cnip.nms.repository.UserRepository;
import com.cnip.nms.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id(1L)
                .username("admin")
                .passwordHash("hashed")
                .email("admin@cnip.network")
                .roleName("ADMIN")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void testLoginSuccess() {
        AuthRequest request = new AuthRequest("admin", "Admin123!");
        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                "admin", "hashed", Collections.emptyList()
        );

        UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken(userDetails, null);

        when(authenticationManager.authenticate(any())).thenReturn(token);
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(sampleUser));
        when(jwtUtil.generateToken(any(UserDetails.class), eq("ADMIN"))).thenReturn("mocked.jwt.token");
        when(jwtUtil.getExpirationMs()).thenReturn(86400000L);

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("mocked.jwt.token", response.getToken());
        assertEquals("admin", response.getUser().getUsername());
        assertEquals("ADMIN", response.getUser().getRole());
    }

    @Test
    void testGetCurrentUser() {
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(sampleUser));

        UserDto userDto = authService.getCurrentUser("admin");

        assertNotNull(userDto);
        assertEquals("admin", userDto.getUsername());
        assertEquals("admin@cnip.network", userDto.getEmail());
    }

    @Test
    void testRegisterCustomerCreatesCustomerAndReturnsToken() {
        CustomerRegistrationRequest request = new CustomerRegistrationRequest();
        request.setUsername("new-customer");
        request.setEmail("CUSTOMER@EXAMPLE.COM");
        request.setPassword("StrongCustomerPass1!");
        User customer = User.builder()
                .id(2L)
                .username("new-customer")
                .email("customer@example.com")
                .passwordHash("encoded")
                .roleName("CUSTOMER")
                .createdAt(LocalDateTime.now())
                .build();
        when(userRepository.existsByUsername("new-customer")).thenReturn(false);
        when(userRepository.existsByEmail("customer@example.com")).thenReturn(false);
        when(passwordEncoder.encode("StrongCustomerPass1!")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenReturn(customer);
        when(jwtUtil.generateToken(any(UserDetails.class), eq("CUSTOMER"))).thenReturn("customer.jwt.token");
        when(jwtUtil.getExpirationMs()).thenReturn(86400000L);

        AuthResponse response = authService.registerCustomer(request);

        assertEquals("customer.jwt.token", response.getToken());
        assertEquals("CUSTOMER", response.getUser().getRole());
        assertEquals("customer@example.com", response.getUser().getEmail());
        verify(auditLogService).logAction("new-customer", "REGISTER_CUSTOMER", "USER", "new-customer", "Customer account created");
        verify(auditLogService).logAction("new-customer", "LOGIN", "USER", "new-customer", "Customer logged in after registration");
    }

    @Test
    void testRegisterCustomerRejectsExistingUsername() {
        CustomerRegistrationRequest request = new CustomerRegistrationRequest();
        request.setUsername("admin");
        request.setEmail("customer@example.com");
        request.setPassword("StrongCustomerPass1!");
        when(userRepository.existsByUsername("admin")).thenReturn(true);

        assertThrows(com.cnip.nms.exception.BadRequestException.class, () -> authService.registerCustomer(request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testRegisterCustomerRejectsPasswordsOverBcryptByteLimit() {
        CustomerRegistrationRequest request = new CustomerRegistrationRequest();
        request.setUsername("new-customer");
        request.setEmail("customer@example.com");
        request.setPassword("é".repeat(37));

        assertThrows(com.cnip.nms.exception.BadRequestException.class, () -> authService.registerCustomer(request));
        verify(passwordEncoder, never()).encode(any());
        verify(userRepository, never()).save(any(User.class));
    }
}
