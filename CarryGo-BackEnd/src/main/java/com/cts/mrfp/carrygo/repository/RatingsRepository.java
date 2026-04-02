package com.cts.mrfp.carrygo.repository;
import org.springframework.data.jpa.repository.JpaRepository;

import com.cts.mrfp.carrygo.model.Ratings;

import java.util.List;

public interface RatingsRepository extends JpaRepository<Ratings, Integer> {
    List<Ratings> findByCommuterUserId(Integer commuterId);
}