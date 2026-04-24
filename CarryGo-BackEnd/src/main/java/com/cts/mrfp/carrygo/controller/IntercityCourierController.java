package com.cts.mrfp.carrygo.controller;

import com.cts.mrfp.carrygo.dto.IntercityCourierDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/intercity")
@CrossOrigin(origins = "*")
public class IntercityCourierController {

    private static final List<IntercityCourierDTO> COURIERS = Arrays.asList(
        new IntercityCourierDTO(1, "DTDC", "Delivering Smiles Nationwide",
            "India's leading express parcel delivery company with 13,000+ pin codes coverage across the country.",
            "📦", "#e8f4fd", "#0066cc", 80, 45, "3-5",
            Arrays.asList("Door-to-Door", "Real-time Tracking", "Insurance Available", "Bulk Discounts"),
            Arrays.asList("Documents", "Parcels", "Bulk Cargo"),
            4.2, 12800, "https://www.dtdc.in",
            Arrays.asList("Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune", "Kolkata"),
            true, null),

        new IntercityCourierDTO(2, "Blue Dart", "South Asia's Premier Express Carrier",
            "Premium express delivery with guaranteed time deliveries and specialized handling for high-value shipments.",
            "🔵", "#fff3e0", "#e65100", 120, 65, "1-3",
            Arrays.asList("Express Delivery", "High-Value Shipments", "Cold Chain", "Same Day"),
            Arrays.asList("Documents", "Parcels", "Pharmaceuticals"),
            4.5, 28400, "https://www.bluedart.com",
            Arrays.asList("Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune", "Kolkata", "Ahmedabad"),
            true, "Fastest"),

        new IntercityCourierDTO(3, "FedEx", "When it Absolutely, Positively Has to Be There",
            "Global express delivery with an extensive domestic and international network, backed by world-class reliability.",
            "🌐", "#e8f5e9", "#4d148c", 150, 80, "1-2",
            Arrays.asList("International", "Priority Express", "Document Services", "Customs Clearance"),
            Arrays.asList("Documents", "International", "Express"),
            4.4, 19200, "https://www.fedex.com/en-in",
            Arrays.asList("Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Kolkata"),
            true, null),

        new IntercityCourierDTO(4, "Delhivery", "India's Largest Fully Integrated Logistics Player",
            "Tech-first logistics company with extensive pin code coverage and affordable rates for all parcel sizes.",
            "🚚", "#f3e5f5", "#6a0dad", 60, 35, "4-6",
            Arrays.asList("Wide Coverage", "Tech-Enabled", "Return Management", "COD Available"),
            Arrays.asList("eCommerce", "Parcels", "Bulk"),
            4.1, 45600, "https://www.delhivery.com",
            Arrays.asList("Pan India", "19000+ Pin Codes"),
            true, "Best Value"),

        new IntercityCourierDTO(5, "Ecom Express", "Enabling eCommerce for All",
            "eCommerce-focused logistics with strong last-mile delivery capabilities and reverse logistics expertise.",
            "🛒", "#e0f7fa", "#00796b", 55, 32, "3-5",
            Arrays.asList("COD Available", "Return Pickup", "Reverse Logistics", "API Integration"),
            Arrays.asList("eCommerce", "Fashion", "Electronics"),
            3.9, 32100, "https://www.ecomexpress.in",
            Arrays.asList("Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune", "Chennai"),
            true, null),

        new IntercityCourierDTO(6, "Xpressbees", "Swift. Reliable. Everywhere.",
            "Fast-growing express logistics platform with smart tech solutions and consistently affordable pricing.",
            "🐝", "#fff8e1", "#f57f17", 65, 38, "2-4",
            Arrays.asList("Express", "COD", "API Integration", "Real-time Tracking"),
            Arrays.asList("eCommerce", "Parcels", "Documents"),
            4.0, 18900, "https://www.xpressbees.com",
            Arrays.asList("Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune", "Chennai", "Kolkata"),
            true, null),

        new IntercityCourierDTO(7, "Shadowfax", "Hyperlocal & Intercity Delivery at Scale",
            "On-demand delivery platform with rapid same-day intercity options powered by a vast gig-economy network.",
            "⚡", "#fce4ec", "#c2185b", 90, 50, "1-2",
            Arrays.asList("Same Day", "Hyperlocal", "Gig Economy", "Instant Pickup"),
            Arrays.asList("Express", "Food", "Documents"),
            4.2, 11200, "https://shadowfax.in",
            Arrays.asList("Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune"),
            true, null),

        new IntercityCourierDTO(8, "Ekart", "Flipkart's Trusted Delivery Network",
            "Flipkart's dedicated logistics arm with an extensive pan-India delivery network and reliable last-mile service.",
            "🛍️", "#e8eaf6", "#3949ab", 50, 30, "3-6",
            Arrays.asList("Wide Network", "COD", "Easy Returns", "Scheduled Delivery"),
            Arrays.asList("eCommerce", "Electronics", "Fashion"),
            3.8, 67800, "https://ekartlogistics.com",
            Arrays.asList("Pan India"),
            true, null)
    );

    @GetMapping("/couriers")
    public ResponseEntity<List<IntercityCourierDTO>> getAllCouriers(
            @RequestParam(required = false) String fromCity,
            @RequestParam(required = false) String toCity,
            @RequestParam(required = false) String sortBy) {

        List<IntercityCourierDTO> result = COURIERS.stream()
                .filter(IntercityCourierDTO::getIsActive)
                .collect(Collectors.toList());

        if (fromCity != null && !fromCity.isBlank()) {
            String from = fromCity.trim().toLowerCase();
            result = result.stream()
                    .filter(c -> c.getCities().stream()
                            .anyMatch(city -> city.toLowerCase().contains(from) || city.equalsIgnoreCase("Pan India")))
                    .collect(Collectors.toList());
        }

        if (toCity != null && !toCity.isBlank()) {
            String to = toCity.trim().toLowerCase();
            result = result.stream()
                    .filter(c -> c.getCities().stream()
                            .anyMatch(city -> city.toLowerCase().contains(to) || city.equalsIgnoreCase("Pan India")))
                    .collect(Collectors.toList());
        }

        if ("price".equals(sortBy)) {
            result.sort((a, b) -> a.getBasePrice().compareTo(b.getBasePrice()));
        } else if ("rating".equals(sortBy)) {
            result.sort((a, b) -> b.getRating().compareTo(a.getRating()));
        } else if ("speed".equals(sortBy)) {
            result.sort((a, b) -> {
                int daysA = Integer.parseInt(a.getEstimatedDays().split("-")[0]);
                int daysB = Integer.parseInt(b.getEstimatedDays().split("-")[0]);
                return Integer.compare(daysA, daysB);
            });
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/couriers/{id}")
    public ResponseEntity<IntercityCourierDTO> getCourierById(@PathVariable Integer id) {
        return COURIERS.stream()
                .filter(c -> c.getId().equals(id))
                .findFirst()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
