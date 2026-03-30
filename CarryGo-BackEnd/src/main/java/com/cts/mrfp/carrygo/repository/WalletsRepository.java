package com.cts.mrfp.carrygo.repository;

import com.cts.mrfp.carrygo.model.Wallets;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface WalletsRepository extends JpaRepository<Wallets, Integer> {
    // Find wallet by the user ID nested in the Wallets entity
    Optional<Wallets> findByUserUserId(Integer userId);
}
