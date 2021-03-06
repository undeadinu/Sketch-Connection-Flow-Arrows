import sketch from 'sketch'
const { toArray } = require('util')

//
//  Variables
//

let UI = require('sketch/ui')
let Group = require('sketch/dom').Group
const pluginKey = "flowArrows"
let arrowConnections = []
let connectionsArray = []
const document = sketch.fromNative(context.document)
const page = document.selectedPage
let docData = context.document.documentData()
let pluginData = context.command.valueForKey_onLayer_forPluginIdentifier("arrowConnections", docData, pluginKey)
let currentParentGroup = docData.currentPage().currentArtboard() || docData.currentPage()
let selection = context.selection
let currentGroup

let lineObject
let sourceObject // currently Sketch can't provide really firsrt selection


//
//  Default Function
//

export default function(context) {

  // Check if we have "Arrows" group
  currentGroup = checkForArrowGroup()

  //Check if we have more than one selection
  if(selection.count() > 1){
    // When user selected more than one layer
    
    // Need to define source object first
    sourceObject = selection.firstObject()
  
    // if there is a line in Plugin Database, we are showing it
    // lineObject = checkConnections(firstObject,secondObject)

    // Fresh Start
    for(var g = 0; g < selection.count(); g++) {
      if(selection[g].objectID() != sourceObject.objectID()){
        createArrow(sourceObject, selection[g])
      }
    }
    
  } else {
    // When user didn't select anything
    sketch.UI.message("Please select more than two layers")
  }
}

//
// Plugin Commands
//

export function updateArrows(context) {
  // TODO: Need to show amount of updated arrows and deleted ones
  // TODO: Need to make a function that will delete arrows and connection itself, if there is no object
  // TODO: Need to go through all the connections and check if we have all the object
  getConnectionsFromPluginData()
  // TODO: If there is no database, we need to clean everything. Don't forget about active artboard
  log(connectionsArray)
  const updateArrowsCounter = connectionsArray.length
  for (let i = 0; i < updateArrowsCounter; i ++) {
    // Need to go through each connection and update arrow position
    updateArrow(connectionsArray[i].firstObject, connectionsArray[i].secondObject, connectionsArray[i].direction, connectionsArray[i].line)
  }
  sketch.UI.message("All arrows are updated 🚀")
}

export function cleanArrows(context) {
  const document = sketch.fromNative(context.document)
  checkForArrowGroup()
  currentGroup.ungroup()
  context.command.setValue_forKey_onLayer_forPluginIdentifier(null, "arrowConnections", docData, pluginKey)
  sketch.UI.message("All Connections are deleted 🎉")
}

export function settings(context) {
  // Shop Popup for asking arrow type
  var options = ['Link Arrow', 'Back Arrow']
  var selection = UI.getSelectionFromUser(
    "Please choose link type", options
  )

  var ok = selection[2]
  var value = options[selection[1]]
  
  if (ok) {
    // If user specified decision
    log(value)
  }
}


//
// Functions
//

function updateArrow(firstObjectID, secondObjectID, direction, lineID) {
  currentGroup = checkForArrowGroup()
  if(currentGroup){
    // If we have already created group before
    let firstObject = document.getLayerWithID(firstObjectID)
    let secondObject = document.getLayerWithID(secondObjectID)
    let lineObject = document.getLayerWithID(lineID)

    if(firstObject && secondObject && lineObject){
      
      lineObject.remove()
      // TODO When we are removing the line, need to remove this info from Sketch Plugin too
      
      let direction = getDirection(firstObjectID, secondObjectID)
      let line = drawLine(firstObjectID, secondObjectID, direction)
      
      addToArrowsGroup(line)
      getConnectionsFromPluginData()
      
      // Storage for current connection
      let connection = {
        firstObject : firstObjectID,
        secondObject : secondObjectID,
        direction: direction,
        line : line.objectID()
      }

      connectionsArray.push(connection)

      // Saving Connection Info to Sketch Plugin
      context.command.setValue_forKey_onLayer_forPluginIdentifier(connectionsArray, "arrowConnections", docData, pluginKey)

    } else {
      // We don't have some of the object. Need to delete line if there is and connection from database
    }

  } else {
    log("Else")
    // If we don't have "Arrows" group 
  }
}

function createArrow(firstObject, secondObject) {
  // Process of creating new connection
  
  const firstObjectID = firstObject.objectID()
  const secondObjectID = secondObject.objectID()

  // Need to understand the direction
  // TODO: Because Sketch is not allowing to get order of selected elements, we will select elements based on it's ID (creation order)
  let direction = getDirection(firstObjectID, secondObjectID)
  let line = drawLine(firstObjectID, secondObjectID, direction)
  addToArrowsGroup(line)
  getConnectionsFromPluginData()
  
  // Storage for current connection
  let connection = {
    firstObject : firstObjectID,
    secondObject : secondObjectID,
    direction: direction,
    line : line.objectID()
  }

  connectionsArray.push(connection)

  // Saving Connection Info to Sketch Plugin
  context.command.setValue_forKey_onLayer_forPluginIdentifier(connectionsArray, "arrowConnections", docData, pluginKey)
  
}

function checkForArrowGroup() {
  // Checking all the groups that we have
  for(let i = 0; i < currentParentGroup.layers().count(); i++){
    if(currentParentGroup.layers()[i].name() == "Arrows") {
      // If we already have "Arrow" group we need to save it's folder
      currentGroup = currentParentGroup.layers()[i]
    } 
  }
  return currentGroup
}

function getDirection(firstObjectID, secondObjectID){
  // Get direction from the source object
  const firstObjectByID = document.getLayerWithID(firstObjectID)
  const secondObjectByID = document.getLayerWithID(secondObjectID)
  const firstObjectByIDMidX = firstObjectByID.frame.x+firstObjectByID.frame.width/2
  const firstObjectByIDMidY = firstObjectByID.frame.y+firstObjectByID.frame.height/2
  const secondObjectByIDMidX = secondObjectByID.frame.x+secondObjectByID.frame.width/2
  const secondObjectByIDMidY = secondObjectByID.frame.y+secondObjectByID.frame.height/2

  const diffX = firstObjectByIDMidX - secondObjectByIDMidX
  const diffY = firstObjectByIDMidY - secondObjectByIDMidY
  const absDiffX = Math.abs(diffX) 
  const absDiffY = Math.abs(diffY)
  let direction

  if(secondObjectByIDMidX > firstObjectByIDMidX){
    // Right Half
    if(secondObjectByIDMidY > firstObjectByIDMidY){
      // Bottom quarter
      if(diffX > diffY) {
        direction = "bottom"
      } else {
        direction = "right"
      }
    } else {
      // Top quarter
      if(absDiffX > absDiffY) {
        direction = "right"
      } else {
        direction = "top"
      }
    }
  } else {
    // Left Half
    if(secondObjectByIDMidY > firstObjectByIDMidY){
      // Bottom quarter
      if(absDiffX > absDiffY) {
        direction = "left"
      } else {
        direction = "bottom"
      }
    } else {
      // Top quarter
      if(diffX > diffY) {
        direction = "left"
      } else {
        direction = "top"
      }
    }
  }
  return direction
}

function drawLine(firstObjectID, secondObjectID, direction){
  let firstLayerPosX, firstLayerPosY, secondLayerPosX, secondLayerPosY, middlePosX, middlePosY
  
  const firstObjectByID = document.getLayerWithID(firstObjectID)
  const secondObjectByID = document.getLayerWithID(secondObjectID)

  // Drawing a line
  let path = NSBezierPath.bezierPath()
  
  // Based on direction, we need to specify connection points
  switch(direction) {
    case "top":
      // First Layer Position Start Point Position
      firstLayerPosX = firstObjectByID.frame.x+firstObjectByID.frame.width/2
      firstLayerPosY = firstObjectByID.frame.y

      // Second Layer Position End Point Position
      secondLayerPosX = secondObjectByID.frame.x+secondObjectByID.frame.width/2
      secondLayerPosY = secondObjectByID.frame.y+secondObjectByID.frame.height

      // Middle Points
      middlePosX = (firstLayerPosX + secondLayerPosX)/2
      middlePosY = (firstLayerPosY + secondLayerPosY)/2

      // Connecting points
      path.moveToPoint(NSMakePoint(firstLayerPosX,firstLayerPosY))
      path.lineToPoint(NSMakePoint(firstLayerPosX,middlePosY))
      path.lineToPoint(NSMakePoint(secondLayerPosX,middlePosY))
      path.lineToPoint(NSMakePoint(secondLayerPosX,secondLayerPosY))

      break;
    case "right":
      // First Layer Position Start Point Position
      firstLayerPosX = firstObjectByID.frame.x+firstObjectByID.frame.width
      firstLayerPosY = firstObjectByID.frame.y+firstObjectByID.frame.height/2

      // Second Layer Position End Point Position
      secondLayerPosX = secondObjectByID.frame.x
      secondLayerPosY = secondObjectByID.frame.y+secondObjectByID.frame.height/2
      
      // Middle Points
      middlePosX = (firstLayerPosX + secondLayerPosX)/2
      middlePosY = (firstLayerPosY + secondLayerPosY)/2

      // Connecting points
      path.moveToPoint(NSMakePoint(firstLayerPosX,firstLayerPosY))
      path.lineToPoint(NSMakePoint(middlePosX,firstLayerPosY))
      path.lineToPoint(NSMakePoint(middlePosX,secondLayerPosY))
      path.lineToPoint(NSMakePoint(secondLayerPosX,secondLayerPosY))

      break;
    case "bottom":
      // First Layer Position Start Point Position
      firstLayerPosX = firstObjectByID.frame.x+firstObjectByID.frame.width/2
      firstLayerPosY = firstObjectByID.frame.y+firstObjectByID.frame.height

      // Second Layer Position End Point Position
      secondLayerPosX = secondObjectByID.frame.x+secondObjectByID.frame.width/2
      secondLayerPosY = secondObjectByID.frame.y

      // Middle Points
      middlePosX = (firstLayerPosX + secondLayerPosX)/2
      middlePosY = (firstLayerPosY + secondLayerPosY)/2
      
      // Connecting points
      path.moveToPoint(NSMakePoint(firstLayerPosX,firstLayerPosY))
      path.lineToPoint(NSMakePoint(firstLayerPosX,middlePosY))
      path.lineToPoint(NSMakePoint(secondLayerPosX,middlePosY))
      path.lineToPoint(NSMakePoint(secondLayerPosX,secondLayerPosY))

      break;
    case "left":
      // First Layer Position Start Point Position
      firstLayerPosX = firstObjectByID.frame.x
      firstLayerPosY = firstObjectByID.frame.y+firstObjectByID.frame.height/2

      // Second Layer Position End Point Position
      secondLayerPosX = secondObjectByID.frame.x+secondObjectByID.frame.width
      secondLayerPosY = secondObjectByID.frame.y+secondObjectByID.frame.height/2

      // Middle Points
      middlePosX = (firstLayerPosX + secondLayerPosX)/2
      middlePosY = (firstLayerPosY + secondLayerPosY)/2

      // Connecting points
      path.moveToPoint(NSMakePoint(firstLayerPosX,firstLayerPosY))
      path.lineToPoint(NSMakePoint(middlePosX,firstLayerPosY))
      path.lineToPoint(NSMakePoint(middlePosX,secondLayerPosY))
      path.lineToPoint(NSMakePoint(secondLayerPosX,secondLayerPosY))

      break;
  }

  //TODO: Provide a separate file with all the stylings

  // Painting the line
  let line = MSShapeGroup.layerWithPath(MSPath.pathWithBezierPath(path))
  
  // Making middle points rounded
  let points = line.layers().firstObject().points()
  points[1].cornerRadius = 20
  points[2].cornerRadius = 20

  // Providing Settings for the arrow
  line.setName("Arrow")

  // Styling Border Style
  let border = line.style().addStylePartOfType(1)
  border.color = MSColor.colorWithRGBADictionary({r: 0.89, g: 0.89, b: 0.89, a: 1})
  border.thickness = 2
  line.style().endMarkerType = 2

  return line
}

function addToArrowsGroup(line){
  
  if(currentGroup){
    // If we already have group
    currentGroup.addLayers([line])

  } else {
    // If we don't have a group
    // Creating a group
    let group = new Group({
      parent: currentParentGroup,
      name: 'Arrows',
      locked: true,
      layers: [line]
    })

    // Moving this group to the bottom of the page
    group.moveToBack()
  }
}

function getConnectionsFromPluginData(){
  if(pluginData){
    // If we have database, need to get all previous arrowConnections
    arrowConnections = context.command.valueForKey_onLayer_forPluginIdentifier("arrowConnections", docData, pluginKey)

    for (let i = 0; i < arrowConnections.length; i ++) {
      connectionsArray.push(arrowConnections[i])
    }
  }
}