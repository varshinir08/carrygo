package com.cts.mrfp.carrygo.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cts.mrfp.carrygo.model.Users;

public interface UsersRepository extends JpaRepository<Users, Integer> {
    Optional<Users> findByEmailAndPassword(String email, String password);
    Optional<Users> findByPhoneAndPassword(String phone, String password);
    Optional<Users> findByEmail(String email);
}




