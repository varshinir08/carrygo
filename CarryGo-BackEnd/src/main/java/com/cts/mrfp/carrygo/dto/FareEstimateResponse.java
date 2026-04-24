package com.cts.mrfp.carrygo.dto;

public class FareEstimateResponse {
    private float baseFare;
    private float distanceFare;
    private float timeFare;
    private float surgeMultiplier;
    private String surgeLabel;
    private float zoneSurcharge;
    private float totalFare;
    private String fareRange;
    private float distanceKm;
    private int estimatedMinutes;
    private boolean hasSurge;

    public FareEstimateResponse() {}

    public float getBaseFare()       { return baseFare; }
    public void setBaseFare(float v) { this.baseFare = v; }

    public float getDistanceFare()       { return distanceFare; }
    public void setDistanceFare(float v) { this.distanceFare = v; }

    public float getTimeFare()       { return timeFare; }
    public void setTimeFare(float v) { this.timeFare = v; }

    public float getSurgeMultiplier()       { return surgeMultiplier; }
    public void setSurgeMultiplier(float v) { this.surgeMultiplier = v; }

    public String getSurgeLabel()       { return surgeLabel; }
    public void setSurgeLabel(String v) { this.surgeLabel = v; }

    public float getZoneSurcharge()       { return zoneSurcharge; }
    public void setZoneSurcharge(float v) { this.zoneSurcharge = v; }

    public float getTotalFare()       { return totalFare; }
    public void setTotalFare(float v) { this.totalFare = v; }

    public String getFareRange()       { return fareRange; }
    public void setFareRange(String v) { this.fareRange = v; }

    public float getDistanceKm()       { return distanceKm; }
    public void setDistanceKm(float v) { this.distanceKm = v; }

    public int getEstimatedMinutes()      { return estimatedMinutes; }
    public void setEstimatedMinutes(int v){ this.estimatedMinutes = v; }

    public boolean isHasSurge()        { return hasSurge; }
    public void setHasSurge(boolean v) { this.hasSurge = v; }
}
