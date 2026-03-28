package com.cts.mrfp.carrygo.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.List;

@Entity
public class Users {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="user_id")
    private Integer userId;




    private String name;
    private String email;
    private String phone;
    private String password;
    private String role;
    private String authProvider;
    private String themePreference;

    private String licenceNumber;
    private LocalDate licenceExpiry;
    private String vehicleType;
    private String vehicleNumber;
    private String vehicleModel;

    public Users() {}

    public Users(Integer userId, String name, String email, String phone, String password, String role, String authProvider, String themePreference, String licenceNumber, LocalDate licenceExpiry, String vehicleType, String vehicleNumber, String vehicleModel) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.password = password;
        this.role = role;
        this.authProvider = authProvider;
        this.themePreference = themePreference;
        this.licenceNumber = licenceNumber;
        this.licenceExpiry = licenceExpiry;
        this.vehicleType = vehicleType;
        this.vehicleNumber = vehicleNumber;
        this.vehicleModel = vehicleModel;
    }

    // Getters and Setters
    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getAuthProvider() { return authProvider; }
    public void setAuthProvider(String authProvider) { this.authProvider = authProvider; }
    public String getThemePreference() { return themePreference; }
    public void setThemePreference(String themePreference) { this.themePreference = themePreference; }
    public String getLicenceNumber() { return licenceNumber; }
    public void setLicenceNumber(String licenceNumber) { this.licenceNumber = licenceNumber; }
    public LocalDate getLicenceExpiry() { return licenceExpiry; }
    public void setLicenceExpiry(LocalDate licenceExpiry) { this.licenceExpiry = licenceExpiry; }
    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }
    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }
    public String getVehicleModel() { return vehicleModel; }
    public void setVehicleModel(String vehicleModel) { this.vehicleModel = vehicleModel; }
}