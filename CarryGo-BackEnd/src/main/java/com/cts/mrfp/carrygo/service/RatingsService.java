package com.cts.mrfp.carrygo.service;

import com.cts.mrfp.carrygo.model.Ratings;
import com.cts.mrfp.carrygo.repository.RatingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class RatingsService {

    @Autowired
    private RatingsRepository ratingsRepository;

    public Ratings addRating(Ratings rating) {
        rating.setCreatedAt(LocalDateTime.now());
        return ratingsRepository.save(rating);
    }

    public List<Ratings> getRatingsByCommuter(Integer commuterId) {
        return ratingsRepository.findByCommuterUserId(commuterId);
    }
}