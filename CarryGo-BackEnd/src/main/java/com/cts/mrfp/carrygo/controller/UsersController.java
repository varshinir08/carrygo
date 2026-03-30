package com.cts.mrfp.carrygo.controller;

import com.cts.mrfp.carrygo.model.Users;
import com.cts.mrfp.carrygo.service.UsersService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:4200") // allow Angular frontend
public class UsersController {
    private final UsersService usersService;

    @Autowired
    public UsersController(UsersService usersService) {
        this.usersService = usersService;
    }

    // Registration endpoint
    @PostMapping("/register")
    public ResponseEntity<Users> register(@RequestBody Users user) {
        Users saved = usersService.register(user);
        return ResponseEntity.ok(saved);
    }

    // Login endpoint
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginData) {
        String email = loginData.get("email");
        String password = loginData.get("password");
        String role = loginData.get("role");

        return usersService.login(email, password, role)
                .<ResponseEntity<?>>map(ResponseEntity::ok) // success → Users object
                .orElseGet(() -> ResponseEntity.status(401).body("Invalid credentials")); // failure → String
    }

    // Retrieve user by ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Integer id) {
        return usersService.getUserById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}