package com.cts.mrfp.carrygo.dto;

public class PorterRouteDTO {

    private Integer routeId;
    private Integer porterId;
    private String fromLocation;
    private Float fromLat;
    private Float fromLng;
    private String toLocation;
    private Float toLat;
    private Float toLng;
    private String departureTime;
    private Boolean isActive;

    public PorterRouteDTO() {}

    public Integer getRouteId() { return routeId; }
    public void setRouteId(Integer routeId) { this.routeId = routeId; }

    public Integer getPorterId() { return porterId; }
    public void setPorterId(Integer porterId) { this.porterId = porterId; }

    public String getFromLocation() { return fromLocation; }
    public void setFromLocation(String fromLocation) { this.fromLocation = fromLocation; }

    public Float getFromLat() { return fromLat; }
    public void setFromLat(Float fromLat) { this.fromLat = fromLat; }

    public Float getFromLng() { return fromLng; }
    public void setFromLng(Float fromLng) { this.fromLng = fromLng; }

    public String getToLocation() { return toLocation; }
    public void setToLocation(String toLocation) { this.toLocation = toLocation; }

    public Float getToLat() { return toLat; }
    public void setToLat(Float toLat) { this.toLat = toLat; }

    public Float getToLng() { return toLng; }
    public void setToLng(Float toLng) { this.toLng = toLng; }

    public String getDepartureTime() { return departureTime; }
    public void setDepartureTime(String departureTime) { this.departureTime = departureTime; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
