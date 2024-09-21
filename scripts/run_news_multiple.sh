make_request() {
    local town="$1"
    local state="$2"
    echo "Processing: $town, $state"
    curl -X POST -H "Content-Type: application/json" -d "{\"town\":\"$town\",\"state\":\"$state\"}" http://localhost:3001/api/city/news
    echo -e "\n---\n"
}

# Read the JSON file
json_file="lib/json/cities.json"

# Process each state and city
while IFS='' read -r line || [ -n "$line" ]; do
    if [[ $line =~ \"(.+)\"\:\ \[(.*)\] ]]; then
        state="${BASH_REMATCH[1]}"
        cities="${BASH_REMATCH[2]}"
        IFS=',' read -ra city_array <<< "$cities"
        for city in "${city_array[@]}"; do
            # Remove leading/trailing spaces and quotes
            city=$(echo "$city" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//')
            
            # Check if the city name contains a space (more than one word)
            if [[ "$city" == *" "* ]]; then
                make_request "$city" "$state"
            fi
        done
    fi
done < "$json_file"