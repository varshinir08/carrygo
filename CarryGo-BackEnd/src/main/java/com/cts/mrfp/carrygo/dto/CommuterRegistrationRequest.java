package com.cts.mrfp.carrygo.dto;

/**
 * Payload for POST /api/users/{userId}/register-commuter.
 * Uses a plain String for licenceExpiry ("YYYY-MM-DD") to avoid
 * Jackson LocalDate deserialization issues across versions.
 */
public class CommuterRegistrationRequest {
    private String vehicleType;
    private String vehicleNumber;
    private String vehicleModel;
    private String licenceNumber;
    private String licenceExpiry;   // "YYYY-MM-DD"

    public String getVehicleType()   { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }

    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }

    public String getVehicleModel()  { return vehicleModel; }
    public void setVehicleModel(String vehicleModel) { this.vehicleModel = vehicleModel; }

    public String getLicenceNumber() { return licenceNumber; }
    public void setLicenceNumber(String licenceNumber) { this.licenceNumber = licenceNumber; }

    public String getLicenceExpiry() { return licenceExpiry; }
    public void setLicenceExpiry(String licenceExpiry) { this.licenceExpiry = licenceExpiry; }
}
