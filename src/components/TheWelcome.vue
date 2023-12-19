<template>
  <ol-map
    ref="map"
    :load-tiles-while-animating="true"
    :load-tiles-while-interacting="true"
    style="height: 700px"
    >
    <ol-view
      ref="view"
      :center="center"
      :rotation="rotation"
      :zoom="zoom"
    />

    <ol-tile-layer>
      <ol-source-wmts
        :attributions="attribution"
        :url="url"
        :format="format"
        :layer="layerName"
        :styles="styleName"
        :matrixSet="matrixSet"
        :tileZoomLevel="80"
      ></ol-source-wmts>
    </ol-tile-layer>

    <ol-vector-layer>
      <ol-source-vector ref="sourceRef" />
    </ol-vector-layer>
    
    <ol-scaleline-control />
  </ol-map>


</template>

<script setup lang="ts" >

import { ref, onUpdated } from "vue";
import { Fill, Stroke, Style } from "ol/style";
import { Feature, Map, View } from "ol";
import Collection from 'ol/Collection.js';
import VectorSource from "ol/source/Vector";
import ol_control_EditBar from 'ol-ext/control/EditBar.js';
import { Select } from "ol/interaction";
import VectorLayer from 'ol/layer/Vector.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import ol_Overlay_Tooltip from 'ol-ext/overlay/Tooltip.js';
import { OSM } from "ol/source";
import TileLayer from "ol/layer/Tile";
import type { DrawEvent } from "ol/interaction/Draw";
import TileGrid from "ol/tilegrid/TileGrid";
import WMTSTileGrid from "ol/tilegrid/WMTS";
import WMTS from "geoportal-extensions-openlayers/src/OpenLayers/Sources/WMTS";
import SourceWMTS from "geoportal-extensions-openlayers/src/OpenLayers/Layers/SourceWMTS";

import SearchEngine from "geoportal-extensions-openlayers/src/OpenLayers/Controls/SearchEngine";
import { Services } from "geoportal-extensions-openlayers";
import MeasureAzimuth from "geoportal-extensions-openlayers/src/OpenLayers/Controls/Measures/MeasureAzimuth";
import MeasureArea from "geoportal-extensions-openlayers/src/OpenLayers/Controls/Measures/MeasureArea";
import MeasureLength from "geoportal-extensions-openlayers/src/OpenLayers/Controls/Measures/MeasureLength";
import ElevationPath from "geoportal-extensions-openlayers/src/OpenLayers/Controls/ElevationPath";
import MousePosition from "geoportal-extensions-openlayers/src/OpenLayers/Controls/MousePosition";
import type { Geometry } from "ol/geom";

Services.getConfig({
  apiKey: "essentiels",
  onSuccess: go,
  onFailure: (e) => {console.log(e)}
});

const zones = ref<Feature<Geometry>[]>([]);
let sourceRef = ref<{ source: VectorSource }>(null);

let vector = ref(new VectorLayer({
  source: new VectorSource({
    format: new GeoJSON()
  })
}))

var resolutions = [
    156543.03392804103,
    78271.5169640205,
    39135.75848201024,
    19567.879241005125,
    9783.939620502562,
    4891.969810251281,
    2445.9849051256406,
    1222.9924525628203,
    611.4962262814101,
    305.74811314070485,
    152.87405657035254,
    76.43702828517625,
    38.218514142588134,
    19.109257071294063,
    9.554628535647034,
    4.777314267823517,
    2.3886571339117584,
    1.1943285669558792,
    0.5971642834779396,
    0.29858214173896974,
    0.14929107086948493,
    0.07464553543474241
] ;

const map = ref();
const center = ref([234814.550892, 5870363.772302]);
const zoom = ref(7);
const rotation = ref(0);

const url = ref("https://wxs.ign.fr/essentiels/geoportail/wmts?");
const layerName = ref("ORTHOIMAGERY.ORTHOPHOTOS");
const format = ref("image/jpeg");
const styleName = ref("normal");
const attribution = ref('IGN');
const matrixSet = ref("PM");

let  selectedFeatures = ref(new Collection());
const drawEnabled = ref(false);
const modifyEnabled = ref(false);
const drawType = ref("Point");


var select = new Select({ multi: true})
select.set('title', 'Sélection')



const matrixIds = [];


for (let i = 0; i < 20; i++) {
  matrixIds[i] = i.toString();
}

const tileGrid = new WMTSTileGrid({
  origin: [-20037508, 20037508],
  resolutions: resolutions,
  matrixIds: matrixIds,
});


const ign_source = new WMTS({
  url: "https://wxs.ign.fr/essentiels/geoportail/wmts?",
  layer: "ORTHOIMAGERY.ORTHOPHOTOS",
  matrixSet: 'PM',
  format: 'image/png',
  projection: 'EPSG:3857',
  tileGrid: tileGrid,
  style: 'normal',
});


const ign = new TileLayer({
  source: new SourceWMTS({
      layer: "ORTHOIMAGERY.ORTHOPHOTOS"
  }),
});
function go() {


  var editbar = new ol_control_EditBar({
    interactions: {
      Info: false,
      Select: select,
      DrawLine: 'Ligne',
      DrawRegular: { title: 'Forme régulière', ptsLabel: 'points', circleLabel: 'cercle'}
    },
    source: sourceRef.value.source,
  })
  map.value.map.addControl(editbar)

  var tooltip = new ol_Overlay_Tooltip();
  map.value.map.addOverlay(tooltip)

  editbar.getInteraction('ModifySelect').on('modifystart', function(e){
    if (e.features.length===1) tooltip.setFeature(e.features[0]);
  });
  editbar.getInteraction('ModifySelect').on('modifyend', function(e){
    tooltip.setFeature();
  });
  editbar.getInteraction('DrawPoint').on('change:active', function(e){
    tooltip.setInfo(e.oldValue ? '' : 'Click map to place a point...');
    console.log()
  });
  editbar.getInteraction('DrawLine').on('drawstart', function(e){
    tooltip.setFeature(e.feature);
    tooltip.setInfo('Click to continue drawing line...');
  });
  editbar.getInteraction('DrawLine').on('drawend', function(e){
    console.log(sourceRef.value.source)
    tooltip.setInfo('Click to continue drawing line...');
  });



  var searchControl = new SearchEngine({
    zoomTo: 14,
    collapsed: false
  });
  map.value.map.addControl(searchControl)

  var mpControl = new MousePosition({
    collapsed: true,
    editCoordinates : true,
    displayAltitude : false,
    zoomTo: 14
  });
  map.value.map.addControl(mpControl)

  var azi = new MeasureAzimuth({});
  map.value.map.addControl(azi);

  var area = new MeasureArea({});
  map.value.map.addControl(area);

  var length = new MeasureLength({});
  map.value.map.addControl(length);

  var elep = new ElevationPath({});
  map.value.map.addControl(elep);

}

// const selectInteactionFilter = (feature : any) => {
//   return feature.values_.name != undefined;
// };

const changeDrawType = (active : boolean, draw : string) => {
  drawEnabled.value = active;
  drawType.value = draw;
  modifyEnabled.value = false;
};

const drawend = (event: DrawEvent ) => {
  zones.value.push(event.feature);
  selectedFeatures.value.push(event.feature)
  drawEnabled.value = false;
  modifyEnabled.value = true;
  console.log("zones", zones.value)
  console.log( 'features',selectedFeatures)
};

const drawStop = () => {
  drawEnabled.value = false;
  modifyEnabled.value = false
};

function vectorStyle() {
  const style = new Style({
    stroke: new Stroke({
      color: "blue",
      width: 2,
    }),
    fill: new Fill({
      color: "rgba(0, 0, 255, 0.4)",
    }),
  });
  return style;
}

</script>

<style>
.GPwidget{
  left: 120px;
}
.ol-scale-line {
  left: 50px;
}


</style>