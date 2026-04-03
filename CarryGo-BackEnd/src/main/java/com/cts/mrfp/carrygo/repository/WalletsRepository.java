package com.cts.mrfp.carrygo.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import com.cts.mrfp.carrygo.model.Wallets;
import java.util.Optional;

public interface WalletsRepository extends JpaRepository<Wallets, Integer> {
    Optional<Wallets> findByUserUserId(Integer userId);
}