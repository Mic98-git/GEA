import pandas as pd
import geopandas as gpd
from dateutil.parser import parse
from sklearn.preprocessing import LabelEncoder
from sklearn.manifold import TSNE
from sklearn import preprocessing

df = pd.read_csv('./earthquakes_2023_global.csv')

# Remove unnecessary rows (duplicates and null) and columns
df = df.drop(df[df['status'] == 'automatic'].index)
df.drop_duplicates(inplace=True)
df.dropna(inplace=True)
df.drop(['nst', 'gap', 'rms', 'net', 'id', 'updated', 'horizontalError', 'status'], axis=1, inplace=True)
df = df.iloc[15000:20000, :]

# Reformat time column
df['time'] = pd.to_datetime(df['time'], utc=True).dt.strftime('%Y-%m-%d %H:%M:%S')

# Month and week preprocessing
months = []
weeks = []
time = df['time']

for elem in time:
    dt = parse(elem)
    months.append(dt.month)
    day = dt.day
    if 0 < day <= 7:
        weeks.append("1")
    elif 7 < day <= 14:
        weeks.append("2")
    elif 14 < day <= 21:
        weeks.append("3")
    else:
        weeks.append("4")

df.insert(0, 'month', months)
df.insert(1, 'week', weeks)

# Depth and magnitude categories preprocessing
def categorize_depth(depth):
    if depth < 70:
        return 'shallow'
    elif 70 <= depth < 300:
        return 'intermediate'
    else:
        return 'deep'

def categorize_magnitude(magnitude):
    if magnitude < 4.0:
        return 'minor'
    elif 4.0 <= magnitude < 5.0:
        return 'light'
    elif 5.0 <= magnitude < 6.0:
        return 'moderate'
    elif 6.0 <= magnitude < 7.0:
        return 'strong'
    elif 7.0 <= magnitude < 8.0:
        return 'major'

df['depth_category'] = df['depth'].apply(categorize_depth)
df['magnitude_category'] = df['mag'].apply(categorize_magnitude)

# Add incremental IDs to the data
df.reset_index(drop=True, inplace=True)
ids = list(range(len(df)))
df.insert(0, 'id', ids)

# Create a GeoDataFrame
gdf = gpd.GeoDataFrame(df, geometry = gpd.points_from_xy(df.longitude, df.latitude), crs="EPSG:4326")

# Save to GeoJSON file
gdf.to_file("../gea-project/public/eq_coordinates.geojson", driver="GeoJSON")

## Parallel coordinates encoding and preprocessing
le_magnitude_type = LabelEncoder()
le_seismic_event = LabelEncoder()
le_reporting_location_source = LabelEncoder()
le_reporting_magnitude_source = LabelEncoder()
le_depth_category = LabelEncoder()

# Fit and transform the data
magnitude_type_encoded = le_magnitude_type.fit_transform(df['magType'])
seismic_event_encoded = le_seismic_event.fit_transform(df['type'])
reporting_location_source_encoded = le_reporting_location_source.fit_transform(df['locationSource'])
reporting_magnitude_source_encoded = le_reporting_magnitude_source.fit_transform(df['magSource'])
depth_category_encoded = le_depth_category.fit_transform(df['depth_category'])

# Create encoding dictionaries
magnitude_type_mapping = {value: code for value, code in zip(le_magnitude_type.classes_, le_magnitude_type.transform(le_magnitude_type.classes_))}
seismic_event_mapping = {value: code for value, code in zip(le_seismic_event.classes_, le_seismic_event.transform(le_seismic_event.classes_))}
reporting_location_source_mapping  = {value: code for value, code in zip(le_reporting_location_source.classes_, le_reporting_location_source.transform(le_reporting_location_source.classes_))}
reporting_magnitude_source_mapping  = {value: code for value, code in zip(le_reporting_magnitude_source.classes_, le_reporting_magnitude_source.transform(le_reporting_magnitude_source.classes_))}
depth_category_mapping = {value: code for value, code in zip(le_depth_category.classes_, le_depth_category.transform(le_depth_category.classes_))}

df['magType'] = df['magType'].map(lambda x: f"{x}: {magnitude_type_mapping[x]}")
df['type'] = df['type'].map(lambda x: f"{x}: {seismic_event_mapping[x]}")
df['locationSource'] = df['locationSource'].map(lambda x: f"{x}: {reporting_location_source_mapping[x]}")
df['magSource'] = df['magSource'].map(lambda x: f"{x}: {reporting_magnitude_source_mapping[x]}")
df['depth_category'] = df['depth_category'].map(lambda x: f"{x}: {depth_category_mapping[x]}")

## t-SNE dimensionality reduction
df['magType_encoded'] = df['magType'].apply(lambda x: int(x.split(': ')[1]))
df['type_encoded'] = df['type'].apply(lambda x: int(x.split(': ')[1]))
core_features = ['mag', 'depth', 'latitude', 'longitude', 'magType_encoded', 'type_encoded', 'depthError', 'magError', 'magNst']
df_filtered = df[core_features].copy()

data = df_filtered.values
std_scale = preprocessing.StandardScaler().fit(data)
data = std_scale.transform(data)

data_tsne = TSNE().fit_transform(data)
x, y =  data_tsne[:, 0], data_tsne[:, 1]

df['tsne_x'] = x
df['tsne_y'] = y

# Drop the encoded columns before saving
df.drop(columns=['magType_encoded', 'type_encoded'], inplace=True)

# Export preprocessed dataset
df.to_csv('../gea-project/public/prep_dataset.csv', index=False, sep=',')