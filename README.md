# pub-utils
Useful utils for the data management of open citations

### Download OpenCitations dataset and get paper details from Crossref
1. Download and unzip citation data csv from the [opencitations webpage](http://opencitations.net/download)

    ```
    unzip data.csv.zip -d [path/to/folder]
    ```
2. Get unique DOIs from file & parse quotes

    ```
     cat data.csv | awk -F',' 'FNR > 1 {gsub(/"/, "", $2);gsub(/"/, "", $3);print $2"\n"$3}' | sort -u -T [dir/for/tmp/files] > [unique/DOIs/file]
    ```
 3. Run the script to get paper details
    ```
    node getCrossrefWorks.js [input/file/with/DOIs] [output/file] [email] > [errored_dois.csv]
    ```

### Find paper details from other sources (Aminer & Microsoft Academic Graph)
1. Some papers from OpenCitations can be retrieved from other sources, before querying the Crossref API to get their details:
    ```
    node src/findDataInCollections.js [unique/dois/file] [output/paper/details/file] [output/not/found/dois/file]
    ```
