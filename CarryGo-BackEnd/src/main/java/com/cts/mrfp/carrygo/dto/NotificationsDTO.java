package com.cts.mrfp.carrygo.dto;

import java.time.LocalDateTime;
import jakarta.validation.constraints.NotBlank;

public class NotificationsDTO {
    private Integer notificationId;
    private Integer userId;
    
    @NotBlank(message = "Notification type is required")
    private String type;
    
    @NotBlank(message = "Message is required")
    private String message;
    
    private Boolean isRead;
    private LocalDateTime createdAt;

    // Constructors
    public NotificationsDTO() {}

    public NotificationsDTO(Integer notificationId, Integer userId, String type, 
                           String message, Boolean isRead, LocalDateTime createdAt) {
        this.notificationId = notificationId;
        this.userId = userId;
        this.type = type;
        this.message = message;
        this.isRead = isRead;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public Integer getNotificationId() { return notificationId; }
    public void setNotificationId(Integer notificationId) { this.notificationId = notificationId; }

    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean isRead) { this.isRead = isRead; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
