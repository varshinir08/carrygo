package com.cts.mrfp.carrygo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cts.mrfp.carrygo.model.Users;

public interface UsersRepository extends JpaRepository<Users, Integer> {
    Optional<Users> findByEmailAndPassword(String email, String password);
    Optional<Users> findByPhoneAndPassword(String phone, String password);
    Optional<Users> findByEmail(String email);
    List<Users> findByIsOnlineTrue();

    @Modifying
    @Query(value = "UPDATE users SET avg_rating = :avgRating WHERE user_id = :userId", nativeQuery = true)
    void updateAvgRating(@Param("userId") Integer userId, @Param("avgRating") Double avgRating);
}




