package com.cts.mrfp.carrygo.service;

import com.cts.mrfp.carrygo.model.Users;
import com.cts.mrfp.carrygo.repository.UsersRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UsersService {
    private final UsersRepository usersRepository;

    public UsersService(UsersRepository usersRepository) {
        this.usersRepository = usersRepository;
    }

    // Registration
    public Users register(Users users) {
        users.setEmail(users.getEmail().trim());
        users.setPassword(users.getPassword().trim());
        users.setRole(users.getRole().trim().toLowerCase()); // normalize role
        return usersRepository.save(users);
    }

    // Login with email + password + role
    public Optional<Users> login(String email, String password, String role) {
        String normalizedEmail = email.trim();
        String normalizedPassword = password.trim();
        String normalizedRole = role.trim().toLowerCase();

        Optional<Users> user = usersRepository.findByEmailAndPassword(normalizedEmail, normalizedPassword);

        // Validate role separately
        return user.filter(u -> u.getRole() != null && u.getRole().equalsIgnoreCase(normalizedRole));
    }

    // Retrieve user by ID
    public Optional<Users> getUserById(Integer userId) {
        return usersRepository.findById(userId);
    }

    // Retrieve user by email
    public Optional<Users> getUserByEmail(String email) {
        return usersRepository.findByEmail(email.trim());
    }

    // Update user online/offline status
    public Optional<Users> updateUserStatus(Integer userId, Boolean isOnline) {
        Optional<Users> user = usersRepository.findById(userId);
        if (user.isPresent()) {
            Users u = user.get();
            u.setIsOnline(isOnline);
            usersRepository.save(u);
        }
        return user;
    }
}
