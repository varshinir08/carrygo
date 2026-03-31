package com.cts.mrfp.carrygo.repository;
import com.cts.mrfp.carrygo.model.Wallets;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface WalletsRepository extends JpaRepository<Wallets, Integer> {
    Optional<Wallets> findByUserUserId(Integer userId);
}