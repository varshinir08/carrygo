package com.cts.mrfp.carrygo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer deliveryId;
    private Integer senderId;
    private String senderName;

    /** "USER" or "PORTER" */
    private String senderRole;

    @Column(length = 1000)
    private String message;

    private LocalDateTime sentAt;

    public ChatMessage() {}

    public Long getId()                    { return id; }
    public void setId(Long id)             { this.id = id; }

    public Integer getDeliveryId()         { return deliveryId; }
    public void setDeliveryId(Integer v)   { this.deliveryId = v; }

    public Integer getSenderId()           { return senderId; }
    public void setSenderId(Integer v)     { this.senderId = v; }

    public String getSenderName()          { return senderName; }
    public void setSenderName(String v)    { this.senderName = v; }

    public String getSenderRole()          { return senderRole; }
    public void setSenderRole(String v)    { this.senderRole = v; }

    public String getMessage()             { return message; }
    public void setMessage(String v)       { this.message = v; }

    public LocalDateTime getSentAt()       { return sentAt; }
    public void setSentAt(LocalDateTime v) { this.sentAt = v; }
}
