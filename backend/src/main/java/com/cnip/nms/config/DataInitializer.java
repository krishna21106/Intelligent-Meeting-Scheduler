package com.cnip.nms.config;

import com.cnip.nms.entity.User;
import com.cnip.nms.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        initUser("admin", "Admin123!", "admin@cnip.network", "ADMIN");
        initUser("operator", "Operator123!", "operator@cnip.network", "OPERATOR");
        initUser("viewer", "Viewer123!", "viewer@cnip.network", "VIEWER");
    }

    private void initUser(String username, String rawPassword, String email, String role) {
        userRepository.findByUsername(username).ifPresentOrElse(
                user -> {
                    user.setPasswordHash(passwordEncoder.encode(rawPassword));
                    user.setRoleName(role);
                    userRepository.save(user);
                    log.info("Initialized credentials for user '{}' with role '{}'", username, role);
                },
                () -> {
                    User newUser = User.builder()
                            .username(username)
                            .passwordHash(passwordEncoder.encode(rawPassword))
                            .email(email)
                            .roleName(role)
                            .createdAt(LocalDateTime.now())
                            .build();
                    userRepository.save(newUser);
                    log.info("Created user '{}' with role '{}'", username, role);
                }
        );
    }
}
