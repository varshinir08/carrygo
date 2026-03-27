package com.cts.mrfp.carrygo.repository;

import com.cts.mrfp.carrygo.model.Users;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsersRepository extends JpaRepository<Users,Integer> {
}
