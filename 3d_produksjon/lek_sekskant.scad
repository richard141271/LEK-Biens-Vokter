// LEK-Såpe™️ Sekskant Form - ENKEL (CLEAN)
// Beregnet for 135g flytende masse -> 120g ferdig tørket såpe.
// Ingen kant, ingen tekst - bare ren form.

// --- INNSTILLINGER ---

soap_width = 60; // 6.0 cm

// Høydeberegning:
// Areal av sekskant = 0.866 * bredde^2.
// Areal = 0.866 * 6^2 = 31.2 cm2.
// Høyde = 135 cm3 / 31.2 cm2 = 4.3 cm.
soap_height = 43; 

wall_thickness = 3;
base_thickness = 3;
draft_angle = 1.06; // Slippvinkel

$fn = 60;

module soap_cavity() {
    rotate([0,0,30]) // Roterer slik at spissen er opp/ned eller flat side opp/ned
    linear_extrude(height = soap_height, scale = draft_angle) {
        circle(d = soap_width / 0.866, $fn=6); // Matematikk for å få riktig bredde på sekskant
    }
}

module mold() {
    difference() {
        // Ytre skall (sylinder som dekker sekskanten)
        translate([0, 0, 0])
        cylinder(
            h = soap_height + base_thickness, 
            r = (soap_width/1.5) * draft_angle + wall_thickness
        );

        // Hulrommet
        translate([0, 0, base_thickness])
        soap_cavity();
    }
}

mold();
