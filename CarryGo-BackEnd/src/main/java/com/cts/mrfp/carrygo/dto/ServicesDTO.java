package com.cts.mrfp.carrygo.dto;

import jakarta.validation.constraints.NotBlank;

public class ServicesDTO {
    private Integer service_Id;
    
    @NotBlank(message = "Service name is required")
    private String service_name;
    
    @NotBlank(message = "Description is required")
    private String description;
    
    private Boolean is_active;

    // Constructors
    public ServicesDTO() {}

    public ServicesDTO(Integer service_Id, String service_name, String description, Boolean is_active) {
        this.service_Id = service_Id;
        this.service_name = service_name;
        this.description = description;
        this.is_active = is_active;
    }

    // Getters and Setters
    public Integer getService_Id() { return service_Id; }
    public void setService_Id(Integer service_Id) { this.service_Id = service_Id; }

    public String getService_name() { return service_name; }
    public void setService_name(String service_name) { this.service_name = service_name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Boolean getIs_active() { return is_active; }
    public void setIs_active(Boolean is_active) { this.is_active = is_active; }
}
