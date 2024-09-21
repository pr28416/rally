# Define your variables
apikey="test_546f3af0ded22498acdd26f73c889c3eff6c4b1a5fc63dbf3bdb0992676"
private_key="test_30cd61e20abf1b9ed03fa7cb6e26d59709cd14085c456440bc0f7f4cf4a"
expires=$(date -v +24H +%s)
data="/api/v2/videos/search?APIKEY=$apikey&EXPIRES=$expires&project_id=1974&user_id=15669899&keywords=nature,animals&content_type=footage,motionbackgrounds&quality=HD&min_duration=30&max_duration=300&has_talent_released=true&has_property_released=false&has_alpha=true&is_editorial=false&categories=1,2,3&page=1&results_per_page=20&sort_by=most_relevant&sort_order=ASC&required_keywords=forest,river&filtered_keywords=urban,city&translate=false&source_language=en&contributor_id=12345&safe_search=true&library_ids=lib1,lib2&exclude_library_ids=lib3,lib4&content_scores=true"

# Generate the HMAC
hmac=$(echo -n "$data" | openssl dgst -sha256 -hmac "${private_key}${expires}" -hex | sed 's/^.* //')

# Make the curl request
curl --location "https://api.storyblocks.com$data&HMAC=$hmac"