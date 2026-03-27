package com.cts.mrfp.carrygo.model;

import jakarta.persistence.*;

@Entity
public class Services {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        @Column(name="service_id")
        private Integer service_Id;
        private String service_name;
        private String description;
        private Boolean is_active;

        // --- Constructors ---

        public Services() {
            // Default constructor required by JPA
        }

        public Services(String service_name , String description, Boolean is_active) {
            this.service_name = service_name;
            this.description = description;
            this.is_active = is_active;
        }

    public Integer getService_Id() {
        return service_Id;
    }

    public void setService_Id(Integer service_Id) {
        this.service_Id = service_Id;
    }

    public String getService_name() {
        return service_name;
    }

    public void setService_name(String service_name) {
        this.service_name = service_name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getIs_active() {
        return is_active;
    }

    public void setIs_active(Boolean is_active) {
        this.is_active = is_active;
    }
}
