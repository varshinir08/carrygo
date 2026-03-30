package com.cts.mrfp.carrygo.repository;

import com.cts.mrfp.carrygo.model.Users;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsersRepository extends JpaRepository<Users, Integer> {
    Optional<Users> findByEmailAndPassword(String email, String password);
    Optional<Users> findByPhoneAndPassword(String phone, String password);
}




