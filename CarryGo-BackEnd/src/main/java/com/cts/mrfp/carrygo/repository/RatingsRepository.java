package com.cts.mrfp.carrygo.repository;
import com.cts.mrfp.carrygo.model.Ratings;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RatingsRepository extends JpaRepository<Ratings, Integer> {
    List<Ratings> findByCommuterUserId(Integer commuterId);
}