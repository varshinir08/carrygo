package com.cts.mrfp.carrygo.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "porter_routes")
public class PorterRoute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "route_id")
    private Integer routeId;

    @ManyToOne
    @JoinColumn(name = "porter_id")
    @JsonIgnore
    private Users porter;

    @Column(name = "from_location")
    private String fromLocation;

    @Column(name = "from_lat")
    private Float fromLat;

    @Column(name = "from_lng")
    private Float fromLng;

    @Column(name = "to_location")
    private String toLocation;

    @Column(name = "to_lat")
    private Float toLat;

    @Column(name = "to_lng")
    private Float toLng;

    @Column(name = "departure_time")
    private String departureTime; // "HH:mm"

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public PorterRoute() {}

    public Integer getRouteId() { return routeId; }
    public void setRouteId(Integer routeId) { this.routeId = routeId; }

    public Users getPorter() { return porter; }
    public void setPorter(Users porter) { this.porter = porter; }

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

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
