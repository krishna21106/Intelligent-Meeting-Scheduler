package com.cnip.nms.controller;

import com.cnip.nms.dto.CustomerRegistrationRequest;
import com.cnip.nms.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;
import static org.springframework.http.MediaType.APPLICATION_JSON;

class AuthControllerTest {

    private final AuthService authService = mock(AuthService.class);
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = standaloneSetup(new AuthController(authService)).build();
    }

    @Test
    void registerMapsRequestAndDelegatesToAuthService() throws Exception {
        when(authService.registerCustomer(any(CustomerRegistrationRequest.class))).thenReturn(null);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "new-customer",
                                  "email": "customer@example.com",
                                  "password": "StrongCustomerPass1!"
                                }
                                """))
                .andExpect(status().isOk());

        ArgumentCaptor<CustomerRegistrationRequest> requestCaptor =
                ArgumentCaptor.forClass(CustomerRegistrationRequest.class);
        verify(authService).registerCustomer(requestCaptor.capture());
        assertEquals("new-customer", requestCaptor.getValue().getUsername());
        assertEquals("customer@example.com", requestCaptor.getValue().getEmail());
    }
}
