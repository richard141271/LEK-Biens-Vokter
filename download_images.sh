#!/bin/bash
# Download images from Wikimedia Commons using the Special:FilePath redirect

mkdir -p public/images/sykdommer

# Clean up old HTML files if they exist (files smaller than 5KB are suspicious for images)
find public/images/sykdommer -name "*.jpg" -size -5k -delete

# Function to download with redirect follow and validation
download_image() {
    target_name=$1
    shift
    candidates=("$@")
    
    # Check if valid image already exists
    if [ -f "public/images/sykdommer/$target_name" ]; then
        if file -b "public/images/sykdommer/$target_name" | grep -qE "image|bitmap|JPEG|PNG"; then
            echo "$target_name already exists and is a valid image. Skipping."
            return 0
        else
             echo "Removing invalid file $target_name..."
             rm "public/images/sykdommer/$target_name"
        fi
    fi
    
    for wiki_filename in "${candidates[@]}"; do
        echo "Attempting to download $wiki_filename as $target_name..."
        url="https://commons.wikimedia.org/wiki/Special:FilePath/$wiki_filename"
        
        # Add delay to avoid 429 Too Many Requests
        sleep 2
        
        # Use curl with -L (follow redirects), -f (fail on error), and User-Agent
        if curl -L -f -A "Mozilla/5.0 (compatible; Bot/1.0)" -o "public/images/sykdommer/$target_name" "$url" --max-time 15; then
            # Check if it's a valid image (not HTML)
            if file -b "public/images/sykdommer/$target_name" | grep -qE "image|bitmap|JPEG|PNG"; then
                echo "Successfully downloaded $target_name from $wiki_filename"
                return 0
            else
                echo "Downloaded file was not an image (likely HTML redirect page). Removing..."
                rm "public/images/sykdommer/$target_name"
            fi
        else
            echo "Failed to download $wiki_filename"
        fi
    done
    
    echo "ERROR: Could not download valid image for $target_name from any candidate."
    return 1
}

# 1. Varroa (Midd)
download_image "varroa.jpg" \
    "Varroa_destructor_adult_male.jpg" \
    "Varroa_destructor_on_Apis_mellifera.jpg"

# 2. Lukket yngelråte (AFB) - American Foulbrood
download_image "lukket_yngelrate.jpg" \
    "Loque_americana.jpg" \
    "American_foulbrood_01.jpg" \
    "American_foulbrood_comb.jpg"

# 3. Åpen yngelråte (EFB) - European Foulbrood
download_image "apen_yngelrate.jpg" \
    "European_foulbrood_CZ.jpg" \
    "European_foulbrood_comb.jpg"

# 4. Kalkyngel (Chalkbrood)
download_image "kalkyngel.jpg" \
    "Ascosphaera_apis.jpg" \
    "Chalkbrood_mummies.jpg" \
    "Kalkbrut.jpg" \
    "Couvain_plâtré.jpg" \
    "Ascosphaera_apis_culture.jpg"

# 5. Nosema
download_image "nosema.jpg" \
    "Nosema_apis_spores.jpg" \
    "Nosema_ceranae_spores.jpg" \
    "Nosema_bombi_spores.jpg" \
    "Nosema_spores.jpg" \
    "Nosema_apis.jpg"

# 6. Frisk kube (Healthy Hive)
download_image "frisk_kube.jpg" \
    "Bees_on_a_honeycomb.jpg" \
    "CSIRO_ScienceImage_7113_Honey_bee_comb_showing_cells.jpg" \
    "Apis_mellifera_carnica_worker_honey_bee_with_pollen.jpg"

echo "Download process complete. Verifying files..."
ls -lh public/images/sykdommer/
file public/images/sykdommer/*
