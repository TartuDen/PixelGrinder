export function isAttackEvaded(evasionStat) {
  const roll = Phaser.Math.FloatBetween(0, 100);
  return roll < evasionStat;
}

export function triggerSkillAnimation(scene, skill, targetSprite) {
  if (!scene || !targetSprite) return;
  const skillSprite = scene.add.sprite(
    targetSprite.x,
    targetSprite.y,
    `${skill.name}_anim`
  );
  skillSprite.setScale(1);
  skillSprite.play(`${skill.name}_anim`);

  skillSprite.on("animationcomplete", () => {
    scene.tweens.add({
      targets: skillSprite,
      alpha: 0,
      duration: 500,
      onComplete: () => skillSprite.destroy(),
    });
  });
}
