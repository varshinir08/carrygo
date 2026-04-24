package com.cts.mrfp.carrygo.dto;

import java.util.List;

public class IntercityCourierDTO {

    private Integer id;
    private String name;
    private String tagline;
    private String description;
    private String logoEmoji;
    private String bgColor;
    private String accentColor;
    private Integer basePrice;
    private Integer pricePerKg;
    private String estimatedDays;
    private List<String> features;
    private List<String> categories;
    private Double rating;
    private Integer reviews;
    private String serviceUrl;
    private List<String> cities;
    private Boolean isActive;
    private String badge;

    public IntercityCourierDTO() {}

    public IntercityCourierDTO(Integer id, String name, String tagline, String description,
            String logoEmoji, String bgColor, String accentColor,
            Integer basePrice, Integer pricePerKg, String estimatedDays,
            List<String> features, List<String> categories,
            Double rating, Integer reviews, String serviceUrl,
            List<String> cities, Boolean isActive, String badge) {
        this.id = id;
        this.name = name;
        this.tagline = tagline;
        this.description = description;
        this.logoEmoji = logoEmoji;
        this.bgColor = bgColor;
        this.accentColor = accentColor;
        this.basePrice = basePrice;
        this.pricePerKg = pricePerKg;
        this.estimatedDays = estimatedDays;
        this.features = features;
        this.categories = categories;
        this.rating = rating;
        this.reviews = reviews;
        this.serviceUrl = serviceUrl;
        this.cities = cities;
        this.isActive = isActive;
        this.badge = badge;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getTagline() { return tagline; }
    public void setTagline(String tagline) { this.tagline = tagline; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getLogoEmoji() { return logoEmoji; }
    public void setLogoEmoji(String logoEmoji) { this.logoEmoji = logoEmoji; }

    public String getBgColor() { return bgColor; }
    public void setBgColor(String bgColor) { this.bgColor = bgColor; }

    public String getAccentColor() { return accentColor; }
    public void setAccentColor(String accentColor) { this.accentColor = accentColor; }

    public Integer getBasePrice() { return basePrice; }
    public void setBasePrice(Integer basePrice) { this.basePrice = basePrice; }

    public Integer getPricePerKg() { return pricePerKg; }
    public void setPricePerKg(Integer pricePerKg) { this.pricePerKg = pricePerKg; }

    public String getEstimatedDays() { return estimatedDays; }
    public void setEstimatedDays(String estimatedDays) { this.estimatedDays = estimatedDays; }

    public List<String> getFeatures() { return features; }
    public void setFeatures(List<String> features) { this.features = features; }

    public List<String> getCategories() { return categories; }
    public void setCategories(List<String> categories) { this.categories = categories; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public Integer getReviews() { return reviews; }
    public void setReviews(Integer reviews) { this.reviews = reviews; }

    public String getServiceUrl() { return serviceUrl; }
    public void setServiceUrl(String serviceUrl) { this.serviceUrl = serviceUrl; }

    public List<String> getCities() { return cities; }
    public void setCities(List<String> cities) { this.cities = cities; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public String getBadge() { return badge; }
    public void setBadge(String badge) { this.badge = badge; }
}
