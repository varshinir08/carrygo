package com.cts.mrfp.carrygo.repository;

import com.cts.mrfp.carrygo.model.PorterRoute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PorterRouteRepository extends JpaRepository<PorterRoute, Integer> {
    List<PorterRoute> findByPorterUserId(Integer porterId);
}
