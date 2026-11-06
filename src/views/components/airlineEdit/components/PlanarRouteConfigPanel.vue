<!--
功能名称：面状航线配置面板
日    期：2026/07/29
-->
<template>
	<div class="config-box">
		<div class="wayline-title__name">Flächenroute</div>
		<div class="wayline-title__param">
			<div class="param-option">
				<Icon icon="svg-icon:mianji" color="#fff" :size="20" />
				<div class="param-value">{{ globeConfig.area }} m²</div>
			</div>
			<div class="param-option">
				<Icon icon="svg-icon:Icon_MissionFrog01" />
				<div class="param-value">{{ globeConfig.lineLength }} m</div>
			</div>
			<div class="param-option">
				<Icon icon="svg-icon:shizhong" color="#fff" />
				<div class="param-value">{{ globeConfig.flyTime }}</div>
			</div>
			<div class="param-option">
				<Icon icon="svg-icon:tupian" color="#fff" />
				<div class="param-value">{{ globeConfig.photoCount }}</div>
			</div>
		</div>
		<div class="group-area">
			<el-scrollbar ref="scrollbarRef">
				<div class="scrollbar-container">
					<el-tooltip popper-class="infoModel" placement="right" :offset="16">
						<div v-if="globeConfig.isSetTakeoffPoint" class="base-box takeoff-box">
							<div>Referenz-Startpunkt gesetzt</div>
							<div class="setTakeoffPoint">
								<Icon icon="svg-icon:takeoffPoint" color="#2d8cf0" />
								<p class="takeoff-action" @click="updateFlyPoint">{{ flyPointStatus ? 'Zurücksetzen' : 'Startpunkt neu setzen' }}</p>
							</div>
						</div>
						<div v-else class="base-box noSetTakeoffPoint" role="button" tabindex="0" @click="updateFlyPoint" @keydown.enter="updateFlyPoint">
							<Icon icon="svg-icon:takeoffPoint" color="#fff" />
							<p class="takeoff-tip">{{ flyPointStatus ? 'In die Karte klicken …' : 'Referenz-Startpunkt setzen' }}</p>
						</div>
						<template #content>
							<p>Der Referenz-Startpunkt dient nur der Planung. Beim Flug zählt der tatsächliche Startpunkt der Drohne.</p>
						</template>
					</el-tooltip>

					<div class="base-box">
						<div>Fluggerät</div>
						<el-select
							v-model="missionSettings.aircraftKey"
							class="photo-trigger-select"
							fit-input-width
							popper-class="planar-route-select-popper"
							@change="handleAircraftChange"
						>
							<el-option v-for="item in aircraftProfiles" :key="item.key" :label="item.name" :value="item.key" />
						</el-select>
						<div class="setting-hint">{{ selectedCameraHint }}</div>
					</div>

					<div class="base-box">
						<div>Sicherheit</div>
						<div class="smalTitle">Bei Verbindungsverlust</div>
						<el-select v-model="missionSettings.rcLostBehaviour" class="photo-trigger-select" fit-input-width popper-class="planar-route-select-popper">
							<el-option v-for="item in rcLostOptions" :key="item.value" :label="item.label" :value="item.value" />
						</el-select>
						<div v-if="missionSettings.rcLostBehaviour === 'goContinue'" class="setting-warning">
							Die Drohne fliegt die Route ohne Verbindung zur Fernsteuerung weiter.
						</div>
						<div class="smalTitle">Nach dem letzten Wegpunkt</div>
						<el-select v-model="missionSettings.finishAction" class="photo-trigger-select" fit-input-width popper-class="planar-route-select-popper">
							<el-option v-for="item in finishActionOptions" :key="item.value" :label="item.label" :value="item.value" />
						</el-select>
						<div class="smalTitle">Sicherheitshöhe nach dem Start</div>
						<el-input-number
							v-model="missionSettings.takeOffSecurityHeight"
							:min="takeOffSecurityHeightRange.min"
							:max="takeOffSecurityHeightRange.max"
							:step="5"
							:precision="0"
							class="setting-number"
						/>
						<span class="setting-unit">m</span>
						<div class="smalTitle">Rückkehrhöhe</div>
						<el-input-number
							v-model="missionSettings.rthHeight"
							:min="rthHeightRange.min"
							:max="rthHeightRange.max"
							:step="10"
							:precision="0"
							class="setting-number"
						/>
						<span class="setting-unit">m</span>
						<div v-if="missionSettings.rthHeight > 120" class="setting-warning">
							Über 120 m – in der EU (Kategorie „Offen“) nur mit Genehmigung zulässig.
						</div>
					</div>

					<div class="base-box">
						<div>Kamera</div>
						<div class="button-box">
							<el-button type="primary" round class="btn-item">Weitwinkel</el-button>
							<el-button round disabled>Infrarot</el-button>
						</div>
					</div>

					<div class="base-box">
						<div>Aufnahmeart</div>
						<el-button-group class="full-width">
							<el-button :color="globeConfig.climbType == 1 ? '#409eff' : '#3c3c3c'" class="half-btn" @click="updateClimbType(1)">Nadir (Orthofoto)</el-button>
							<el-button :color="globeConfig.climbType != 1 ? '#409eff' : '#3c3c3c'" class="half-btn" @click="updateClimbType(2)">Schräg (5 Richtungen)</el-button>
						</el-button-group>
					</div>

					<el-tooltip popper-class="infoModel" placement="right" :offset="16">
						<div class="base-box">
							<div>Höhenbezug</div>
							<el-button-group class="height-type-group">
								<el-button :color="globeConfig.heightType == 1 ? '#409eff' : '#3c3c3c'" class="third-btn" @click="updateHeightType(1)">Über Meer</el-button>
								<el-button :color="globeConfig.heightType == 2 ? '#409eff' : '#3c3c3c'" class="third-btn" :disabled="!globeConfig.isSetTakeoffPoint" @click="updateHeightType(2)"
									>Über Startpunkt</el-button
								>
								<el-button :color="globeConfig.heightType == 3 ? '#409eff' : '#3c3c3c'" class="third-btn" @click="updateHeightType(3)">Über Gelände</el-button>
							</el-button-group>

							<div class="flyset-box">
								<div class="height-image-box">
									<img v-if="globeConfig.heightType == 1" src="../img/height-asl.svg" alt="Skizze: Höhe über Meer" class="height-image" />
									<img v-if="globeConfig.heightType == 3" src="../img/height-agl.svg" alt="Skizze: Höhe über Gelände" class="height-image" />
									<img v-if="globeConfig.heightType == 2" src="../img/height-alt.svg" alt="Skizze: Höhe über Startpunkt" class="height-image" />
								</div>
								<div class="right-box">
									<el-button :disabled="globeConfig.lineHeight >= 1500" color="#3c3c3c" class="height-step-btn" @click="calclineHeight(100)">+100</el-button>
									<el-button :disabled="globeConfig.lineHeight >= 1500" color="#3c3c3c" class="height-step-btn" @click="calclineHeight(10)">+10</el-button>
									<div class="height-value-box">
										<el-input v-if="showHeightInput" ref="inputRef" v-model="globeConfig.lineHeight" class="height-input" autofocus @blur="calclineHeight(0)" />
										<span v-else class="num" @click="showHeightInput = true">{{ globeConfig.lineHeight?.toFixed(0) }}</span>
										<span>m</span>
									</div>
									<el-button :disabled="globeConfig.lineHeight <= 2" color="#3c3c3c" class="height-step-btn" @click="calclineHeight(-10)">-10</el-button>
									<el-button :disabled="globeConfig.lineHeight <= 2" color="#3c3c3c" class="height-step-btn" @click="calclineHeight(-100)">-100</el-button>
								</div>
							</div>
						</div>
						<template #content>
							<p v-if="globeConfig.heightType == 1">Höhe über Meer (ASL, EGM96): Alle Wegpunkte liegen auf derselben Höhe über dem Meeresspiegel.</p>
							<p v-else-if="globeConfig.heightType == 2">Höhe über Startpunkt (ALT): Alle Wegpunkte liegen auf derselben Höhe über dem Startpunkt.</p>
							<p v-else>Höhe über Gelände (AGL): Die Wegpunkte folgen dem Gelände und halten überall denselben Abstand zum Boden.</p>
						</template>
					</el-tooltip>

					<div v-if="isObliqueMode" class="base-box gimbal-pitch-box">
						<div class="gimbal-pitch-header">
							<div>Gimbal-Neigung</div>
							<div class="gimbal-pitch-value">
								<span class="gimbal-pitch-num">{{ globeConfig.smartObliqueGimbalPitch }}</span>
								<span>°</span>
							</div>
						</div>
						<div class="gimbal-pitch-control">
							<el-button :disabled="globeConfig.smartObliqueGimbalPitch <= -85" color="#3c3c3c" icon="Minus" class="gimbal-pitch-btn" @click="changeGimbalPitch(-1)"></el-button>
							<div class="gimbal-pitch-slider">
								<el-slider
									v-model="globeConfig.smartObliqueGimbalPitch"
									:min="-85"
									:max="-40"
									:step="1"
									:show-tooltip="false"
									size="small"
									@change="handleGimbalPitchSliderChange"
								/>
							</div>
							<el-button :disabled="globeConfig.smartObliqueGimbalPitch >= -40" color="#3c3c3c" icon="Plus" class="gimbal-pitch-btn" @click="changeGimbalPitch(1)"></el-button>
						</div>
					</div>

					<div class="base-box">
						<div>Routengeschwindigkeit</div>
						<div class="flight-speed-row">
							<el-button :disabled="Number(globeConfig.speed) <= 1" color="#3c3c3c" icon="Minus" class="flight-speed-btn" @click="changeFlightSpeed(-1)"></el-button>
							<div class="flight-speed-value">
								<el-input v-if="showSpeedInput" ref="inputRef" v-model="globeConfig.speed" :max="15" min="1" class="flight-speed-input" autofocus @blur="handleFlightSpeedBlur" />
								<span v-else class="num flight-speed-num" @click="showSpeedInput = true">{{ globeConfig.speed }}</span>
								<span>m/s</span>
							</div>
							<el-button :disabled="isFlightSpeedAtHardMax" color="#3c3c3c" icon="Plus" class="flight-speed-btn" @click="changeFlightSpeed(1)"></el-button>
						</div>
						<div class="flight-speed-hint">Empfohlen {{ flightSpeedSuggested }} m/s (bis 15 möglich)</div>
					</div>

					<div class="base-box gimbal-pitch-box">
						<div class="gimbal-pitch-header">
							<div>Ausrichtung der Fluglinien</div>
							<div class="gimbal-pitch-value">
								<span class="gimbal-pitch-num">{{ Number(globeConfig.lineAngle).toFixed(1) }}</span>
								<span>°</span>
							</div>
						</div>
						<div class="gimbal-pitch-control">
							<el-button :disabled="globeConfig.lineAngle <= 0" color="#3c3c3c" icon="Minus" class="gimbal-pitch-btn" @click="changeLineAngle(-1)"></el-button>
							<div class="gimbal-pitch-slider" @pointerdown="beginLineAngleSliderInteraction">
								<el-slider
									:model-value="globeConfig.lineAngle"
									:min="0"
									:max="179"
									:step="1"
									:show-tooltip="false"
									size="small"
									@update:model-value="handleLineAngleSliderInput"
									@change="handleLineAngleSliderChange"
								/>
							</div>
							<el-button :disabled="globeConfig.lineAngle >= 179" color="#3c3c3c" icon="Plus" class="gimbal-pitch-btn" @click="changeLineAngle(1)"></el-button>
						</div>
					</div>

					<div class="base-box advanced-box">
						<el-collapse @change="collapseChange">
							<el-collapse-item name="1">
								<template #title>
									<div class="advanced-title">Erweiterte Einstellungen</div>
								</template>
								<template #icon="{ isActive }">
									<el-icon v-if="!isActive" size="18"><ArrowDownBold /></el-icon>
									<el-icon v-else size="18"><ArrowUpBold /></el-icon>
								</template>
								<template #default>
									<div>Auslösung</div>
									<el-select
										v-model="globeConfig.photoTriggerMode"
										class="photo-trigger-select"
										fit-input-width
										popper-class="planar-route-select-popper"
										@change="handlePhotoTriggerChange"
									>
										<el-option v-for="item in photoTriggerOptions" :key="item.value" :label="item.label" :value="item.value" />
									</el-select>

									<div>Anfluggeschwindigkeit</div>
									<div class="speed-row">
										<el-button :disabled="globeConfig.takeoffSpeed <= 1" color="#3c3c3c" icon="Minus" class="speed-btn" @click="changeTakeoffSpeed(-1)"></el-button>
										<div class="speed-value">
											<el-input
												v-if="showTakeOffSpeedInput"
												ref="inputRef"
												v-model="globeConfig.takeoffSpeed"
												max="15"
												min="1"
												class="speed-input"
												autofocus
												@blur="handleTakeoffSpeedBlur"
											/>
											<span v-else class="num speed-num" @click="showTakeOffSpeedInput = true">{{ globeConfig.takeoffSpeed }}</span>
											<span>m/s</span>
										</div>
										<el-button :disabled="globeConfig.takeoffSpeed >= 15" color="#3c3c3c" icon="Plus" class="speed-btn" @click="changeTakeoffSpeed(1)"></el-button>
									</div>

									<div class="smalTitle">Querüberlappung</div>
									<div class="overlap-row">
										<el-button color="#3c3c3c" class="overlap-btn" :disabled="globeConfig.overlapW <= 10" @click="changeOverlap('overlapW', -10)">-10</el-button>
										<el-button color="#3c3c3c" class="overlap-btn" :disabled="globeConfig.overlapW <= 10" @click="changeOverlap('overlapW', -5)">-5</el-button>
										<el-button color="#3c3c3c" class="overlap-btn" :disabled="globeConfig.overlapW <= 10" @click="changeOverlap('overlapW', -1)">-1</el-button>
										<div class="overlap-value">
											<span class="num speed-num">{{ globeConfig.overlapW }}</span>
											<span>%</span>
										</div>
										<el-button color="#3c3c3c" class="overlap-btn" :disabled="globeConfig.overlapW >= 90" @click="changeOverlap('overlapW', 1)">+1</el-button>
										<el-button color="#3c3c3c" class="overlap-btn" :disabled="globeConfig.overlapW >= 90" @click="changeOverlap('overlapW', 5)">+5</el-button>
										<el-button color="#3c3c3c" class="overlap-btn" :disabled="globeConfig.overlapW >= 90" @click="changeOverlap('overlapW', 10)">+10</el-button>
									</div>

									<div class="smalTitle">Längsüberlappung</div>
									<div class="overlap-row">
										<el-button color="#3c3c3c" class="overlap-btn" :disabled="globeConfig.overlapH <= 10" @click="changeOverlap('overlapH', -10)">-10</el-button>
										<el-button color="#3c3c3c" class="overlap-btn" :disabled="globeConfig.overlapH <= 10" @click="changeOverlap('overlapH', -5)">-5</el-button>
										<el-button color="#3c3c3c" class="overlap-btn" :disabled="globeConfig.overlapH <= 10" @click="changeOverlap('overlapH', -1)">-1</el-button>
										<div class="overlap-value">
											<span class="num speed-num">{{ globeConfig.overlapH }}</span>
											<span>%</span>
										</div>
										<el-button color="#3c3c3c" class="overlap-btn" :disabled="globeConfig.overlapH >= 90" @click="changeOverlap('overlapH', 1)">+1</el-button>
										<el-button color="#3c3c3c" class="overlap-btn" :disabled="globeConfig.overlapH >= 90" @click="changeOverlap('overlapH', 5)">+5</el-button>
										<el-button color="#3c3c3c" class="overlap-btn" :disabled="globeConfig.overlapH >= 90" @click="changeOverlap('overlapH', 10)">+10</el-button>
									</div>
								</template>
							</el-collapse-item>
						</el-collapse>
					</div>
				</div>
			</el-scrollbar>
		</div>
	</div>
</template>

<script lang="ts" src="./PlanarRouteConfigPanel.ts"></script>

<style scoped lang="scss">
.scrollbar-container {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.config-box {
	width: 400px;
	height: 100%;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

.wayline-title__name {
	color: #fff;
	padding: 16px;
	font-size: 16px;
	line-height: 24px;
}

.wayline-title__param {
	border-top: 1px solid rgba(255, 255, 255, 0.15);
	border-bottom: 1px solid rgba(255, 255, 255, 0.15);
	display: flex;
	position: relative;
}

.param-option {
	flex-direction: column;
	flex: auto;
	justify-content: center;
	align-items: center;
	height: 48px;
	margin: 8px 0;
	display: flex;
	border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.param-value {
	color: #fff;
	letter-spacing: 0;
	margin-top: 2px;
	font-size: 14px;
	line-height: 22px;
}

.group-area {
	flex: 1;
	min-height: 0;
	overflow: hidden;
	padding: 16px;
	display: flex;
	flex-direction: column;

	:deep(.el-scrollbar) {
		flex: 1;
		min-height: 0;
	}
}

.button-box {
	display: flex;
	margin-top: 8px;
	margin-bottom: 10px;

	.el-button {
		flex: 1;
		height: 28px;
	}
}

.base-box {
	background-color: #232323;
	color: #fff;
	border-radius: 8px;
	padding: 16px;
	position: relative;
	font-size: 14px;
}

.takeoff-box {
	display: flex;
	justify-content: space-between;
}

.takeoff-action {
	color: #2d8cf0;
	margin-left: 5px;
}

.takeoff-tip {
	color: #fff;
	margin-left: 5px;
}

.setting-hint {
	margin-top: 6px;
	font-size: 12px;
	color: #a0a0a0;
}
.setting-warning {
	margin-top: 6px;
	font-size: 12px;
	color: #f0a020;
}
.setting-number {
	width: 140px;
	margin-top: 6px;
}
.setting-unit {
	margin-left: 8px;
}
.noSetTakeoffPoint {
	cursor: pointer;
	height: 52px;
	background: #2d8cf0;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
}

.noSetTakeoffPoint:hover {
	background: #5cadff;
}

.setTakeoffPoint {
	display: flex;
	align-items: center;
	cursor: pointer;
}

.full-width {
	width: 100%;
}

.half-btn {
	width: 50%;
	color: #fff;
}

.height-type-group {
	width: 100%;
	margin-top: 10px;
}

.third-btn {
	width: 33%;
	color: #fff;
}

.flyset-box {
	display: flex;
	justify-content: center;

	.right-box {
		width: 132px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		margin-left: 30px;

		.el-button {
			margin: 3px 0;
		}
	}
}

.height-image-box {
	height: 126px;
}

.height-image {
	height: 100%;
}

.height-step-btn {
	color: #fff;
	width: 50px;
	height: 20px;
}

.height-value-box {
	white-space: nowrap;
}

.height-input {
	min-width: 50px;
	height: 28px;
}

.num {
	display: inline-block;
	text-align: center;
	width: 50px;
	color: #2d8cf0;
	font-weight: bold;
	font-size: 20px;
}

.num:hover {
	text-decoration: underline;
}

.gimbal-pitch-box {
	padding: 16px 18px;

	:deep(.el-slider__runway) {
		background: #5f5f5f !important;
		height: 4px !important;
	}

	:deep(.el-slider__bar) {
		background: #2d8cf0 !important;
		height: 4px !important;
	}

	:deep(.el-slider__button) {
		border: none !important;
		width: 16px;
		height: 16px;
		background: #fff;
		transform: translateY(-1px);
	}
}

.gimbal-pitch-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.gimbal-pitch-value {
	display: flex;
	align-items: center;
	gap: 2px;
}

.gimbal-pitch-num {
	color: #2d8cf0;
	font-weight: bold;
	font-size: 20px;
	line-height: 1;
}

.gimbal-pitch-control {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-top: 12px;
}

.gimbal-pitch-btn {
	flex: 0 0 32px;
	width: 32px;
	height: 32px;
	color: #fff;
}

.gimbal-pitch-slider {
	flex: 1;
}

.flight-speed-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 10px;
	height: 40px;
}

.flight-speed-btn {
	color: #fff;
	width: 32px;
	height: 32px;
}

.flight-speed-value {
	display: flex;
	align-items: center;
}

.flight-speed-input {
	width: 80px;
	height: 28px;
}

.flight-speed-num {
	font-size: 28px;
}

.flight-speed-hint {
	margin-top: 4px;
	font-size: 12px;
	opacity: 0.7;
}

.smalTitle {
	margin: 5px 0;
	font-size: 14px;
}

.advanced-box {
	padding: 0 16px;

	:deep(.el-collapse) {
		border: none !important;
	}
	:deep(.el-collapse-item__header) {
		color: #fff !important;
		background: transparent !important;
		border: none !important;
	}
	:deep(.el-collapse-item__wrap) {
		border: none !important;
		background: transparent !important;
	}
	:deep(.el-collapse-item__content) {
		color: #fff !important;
		padding-bottom: 16px;
	}
}

.advanced-title {
	font-size: 14px;
	text-align: center;
	width: 100%;
}

.photo-trigger-select {
	width: 100%;
	margin-top: 10px;
	margin-bottom: 16px;

	:deep(.el-select__wrapper) {
		background: #333 !important;
		box-shadow: none !important;
		border: none !important;
		border-radius: 2px;
		min-height: 36px;
		padding: 0 12px;
	}

	:deep(.el-select__wrapper:hover),
	:deep(.el-select__wrapper.is-focused) {
		box-shadow: none !important;
		border: none !important;
		background: #333 !important;
	}

	:deep(.el-select__selected-item) {
		color: #fff;
		font-size: 14px;
	}

	:deep(.el-select__caret) {
		color: #fff;
	}
}

.speed-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 10px;
	height: 40px;
}

.speed-btn {
	color: #fff;
	width: 32px;
	height: 32px;
}

.speed-value {
	display: flex;
	align-items: center;
}

.speed-input {
	width: 80px;
	height: 28px;
}

.speed-num {
	font-size: 28px;
}

.overlap-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 10px;
	margin-bottom: 10px;
}

.overlap-btn {
	color: #fff;
	width: 40px;
	height: 28px;
	padding: 0;
	margin: 0 !important;
}

.overlap-value {
	display: flex;
	align-items: center;
	min-width: 70px;
	justify-content: center;
}
</style>

<style lang="scss">
.infoModel {
	width: 250px;
	font-size: 12px;
	flex-direction: column;
	align-items: center;
	padding: 10px;
	display: flex;
	border-radius: 0 3px 3px 0;

	.el-popper__arrow:before {
		background: #1c1c1c !important;
		border: none !important;
	}
}

.infoModel.el-popper.is-dark {
	background: #1c1c1c !important;
	color: #fff !important;
	border: none !important;
}

.infoModel.infoModel2 {
	width: 420px;
}

.planar-route-select-popper.el-popper {
	background: #1a1a1a !important;
	border: none !important;
	box-shadow: none !important;
	padding: 0 !important;
	border-radius: 2px !important;

	.el-popper__arrow {
		display: none;
	}

	.el-select-dropdown__list {
		padding: 0 !important;
	}

	.el-select-dropdown__item {
		height: 36px;
		line-height: 36px;
		padding: 0 12px;
		font-size: 14px;
		color: #fff !important;
		background: #333 !important;
		border-bottom: 1px solid #1a1a1a;

		&:last-child {
			border-bottom: none;
		}
	}

	.el-select-dropdown__item.is-hovering,
	.el-select-dropdown__item:hover {
		background: #40566b !important;
		color: #fff !important;
	}

	.el-select-dropdown__item.is-selected {
		background: #40566b !important;
		color: #2e86de !important;
		font-weight: 400;
	}
}
</style>
