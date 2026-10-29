package com.cnip.nms.dto;

public class AuthResponse {
    private String token;
    private String tokenType;
    private long expiresIn;
    private UserDto user;

    public AuthResponse() {}

    public AuthResponse(String token, String tokenType, long expiresIn, UserDto user) {
        this.token = token;
        this.tokenType = tokenType;
        this.expiresIn = expiresIn;
        this.user = user;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }
    public long getExpiresIn() { return expiresIn; }
    public void setExpiresIn(long expiresIn) { this.expiresIn = expiresIn; }
    public UserDto getUser() { return user; }
    public void setUser(UserDto user) { this.user = user; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String token;
        private String tokenType;
        private long expiresIn;
        private UserDto user;

        public Builder token(String token) { this.token = token; return this; }
        public Builder tokenType(String tokenType) { this.tokenType = tokenType; return this; }
        public Builder expiresIn(long expiresIn) { this.expiresIn = expiresIn; return this; }
        public Builder user(UserDto user) { this.user = user; return this; }
        public AuthResponse build() { return new AuthResponse(token, tokenType, expiresIn, user); }
    }
}
