package com.cts.mrfp.carrygo.service;

import com.cts.mrfp.carrygo.dto.RatingsDTO;
import com.cts.mrfp.carrygo.model.Deliveries;
import com.cts.mrfp.carrygo.model.Ratings;
import com.cts.mrfp.carrygo.model.Users;
import com.cts.mrfp.carrygo.repository.RatingsRepository;
import com.cts.mrfp.carrygo.repository.UsersRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class RatingsService {

    @Autowired
    private RatingsRepository ratingsRepository;

    @Autowired
    private UsersRepository usersRepository;

    @PersistenceContext
    private EntityManager em;

    /**
     * Saves a new rating. Uses getReference() for FK associations so no SELECT
     * is executed against the users/deliveries tables — avoids any column-not-found
     * errors if schema migrations haven't run yet.
     */
    @Transactional
    public Ratings addRating(RatingsDTO dto) {
        Deliveries delivery = em.getReference(Deliveries.class, dto.getDeliveryId());
        Users sender        = em.getReference(Users.class,      dto.getSenderId());
        Users commuter      = em.getReference(Users.class,      dto.getCommuterId());

        Ratings rating = new Ratings();
        rating.setDelivery(delivery);
        rating.setSender(sender);
        rating.setCommuter(commuter);
        rating.setRating(dto.getRating());
        rating.setComment(dto.getComment());
        rating.setCreatedAt(LocalDateTime.now());

        return ratingsRepository.save(rating);
    }

    /**
     * Recalculates and persists the commuter's average rating.
     * Called after addRating — kept separate so a failure here never
     * rolls back the already-committed rating insert.
     */
    @Transactional
    public void updateCommuterAvgRating(Integer commuterId) {
        Double avg = ratingsRepository.findAvgRatingByCommuterId(commuterId);
        if (avg == null) return;
        double rounded = Math.round(avg * 10.0) / 10.0;
        usersRepository.updateAvgRating(commuterId, rounded);
    }

    public Double getAvgRating(Integer commuterId) {
        Double avg = ratingsRepository.findAvgRatingByCommuterId(commuterId);
        if (avg == null) return null;
        return Math.round(avg * 10.0) / 10.0;
    }

    public List<RatingsDTO> getRatingsByCommuter(Integer commuterId) {
        return ratingsRepository.findDTOsByCommuterId(commuterId);
    }

    public boolean isDeliveryRated(Integer deliveryId) {
        return ratingsRepository.existsByDelivery_DeliveryId(deliveryId);
    }
}
