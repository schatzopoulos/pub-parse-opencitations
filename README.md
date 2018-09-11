# pub-parse-opencitations
Utils that help parsing the opecitations citation links and get full paper details with crossref

1. Download and unzip citation data csv from the [opencitations webpage](http://opencitations.net/download)

    ```
    unzip data.csv.zip -d [path/to/folder]
    ```
2. Get unique DOIs from file & parse quotes

    ```
     cat data.csv | awk -F',' 'FNR > 1 {gsub(/"/, "", $2);gsub(/"/, "", $3);print $2"\n"$3}' | sort -T [dir/for/tmp/files] | uniq > [unique/DOIs/file]
    ```
 3. 
