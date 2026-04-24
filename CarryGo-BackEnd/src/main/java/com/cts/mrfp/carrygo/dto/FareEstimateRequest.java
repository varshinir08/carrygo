package com.cts.mrfp.carrygo.dto;

public class FareEstimateRequest {
    private Float pickupLat;
    private Float pickupLng;
    private Float dropLat;
    private Float dropLng;
    private String vehicleType; // bike | auto | mini | sedan | suv

    public FareEstimateRequest() {}

    public Float getPickupLat()  { return pickupLat;  }
    public void setPickupLat(Float v) { this.pickupLat = v; }

    public Float getPickupLng()  { return pickupLng;  }
    public void setPickupLng(Float v) { this.pickupLng = v; }

    public Float getDropLat()    { return dropLat;    }
    public void setDropLat(Float v) { this.dropLat = v; }

    public Float getDropLng()    { return dropLng;    }
    public void setDropLng(Float v) { this.dropLng = v; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String v) { this.vehicleType = v; }
}
