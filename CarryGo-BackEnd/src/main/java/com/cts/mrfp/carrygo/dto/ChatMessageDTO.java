package com.cts.mrfp.carrygo.dto;

import java.time.LocalDateTime;

public class ChatMessageDTO {
    private Long id;
    private Integer deliveryId;
    private Integer senderId;
    private String senderName;
    private String senderRole;
    private String message;
    private LocalDateTime sentAt;

    public ChatMessageDTO() {}

    public Long getId()                     { return id; }
    public void setId(Long v)               { this.id = v; }

    public Integer getDeliveryId()          { return deliveryId; }
    public void setDeliveryId(Integer v)    { this.deliveryId = v; }

    public Integer getSenderId()            { return senderId; }
    public void setSenderId(Integer v)      { this.senderId = v; }

    public String getSenderName()           { return senderName; }
    public void setSenderName(String v)     { this.senderName = v; }

    public String getSenderRole()           { return senderRole; }
    public void setSenderRole(String v)     { this.senderRole = v; }

    public String getMessage()              { return message; }
    public void setMessage(String v)        { this.message = v; }

    public LocalDateTime getSentAt()        { return sentAt; }
    public void setSentAt(LocalDateTime v)  { this.sentAt = v; }
}
