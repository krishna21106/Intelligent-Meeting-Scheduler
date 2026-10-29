package com.cnip.nms.dto;

import java.util.List;

public class AlertActionDto {
    private List<Long> alertIds;
    private String action;
    private String comment;

    public AlertActionDto() {}

    public AlertActionDto(List<Long> alertIds, String action, String comment) {
        this.alertIds = alertIds;
        this.action = action;
        this.comment = comment;
    }

    public List<Long> getAlertIds() { return alertIds; }
    public void setAlertIds(List<Long> alertIds) { this.alertIds = alertIds; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private List<Long> alertIds;
        private String action;
        private String comment;

        public Builder alertIds(List<Long> alertIds) { this.alertIds = alertIds; return this; }
        public Builder action(String action) { this.action = action; return this; }
        public Builder comment(String comment) { this.comment = comment; return this; }
        public AlertActionDto build() { return new AlertActionDto(alertIds, action, comment); }
    }
}
