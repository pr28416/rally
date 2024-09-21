
publicKey="test_546f3af0ded22498acdd26f73c889c3eff6c4b1a5fc63dbf3bdb0992676"
privateKey="test_30cd61e20abf1b9ed03fa7cb6e26d59709cd14085c456440bc0f7f4cf4a"

# url info
baseUrl="https://api.videoblocks.com"
resource="/api/v2/videos/search"

# HMAC generation
expires=$(date +%s)
# hmac=$(printf %s "$resource" | openssl dgst -sha256 -hmac "$expires$privateKey" -hex)
# hmac=${hmac/(stdin)\= /''}

# hmac=$(echo "$hmac" | sed 's/^SHA2-256//')

# echo "Generated HMAC: $hmac"

# curl request
curl --location "$baseUrl$resource?APIKEY=$publicKey&EXPIRES=$expires&HMAC=e3b0c34057a40cc085c74354230e40207974ed0860cfa1b34af25fbc16d6d86b&project_id=1974&user_id=15669899&keywords=nature,animals&content_type=footage,motionbackgrounds&quality=HD&min_duration=30&max_duration=300&has_talent_released=true&has_property_released=false&has_alpha=true&is_editorial=false&categories=1,2,3&page=1&results_per_page=20&sort_by=most_relevant&sort_order=ASC&required_keywords=forest,river&filtered_keywords=urban,city&translate=false&source_language=en&contributor_id=12345&safe_search=true&library_ids=lib1,lib2&exclude_library_ids=lib3,lib4&content_scores=true"